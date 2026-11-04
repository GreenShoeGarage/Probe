/* Byte-preserving serial capture. The port is injected; this module never selects hardware. */
export const CAPTURE_FORMAT = 'probe-serial-v1';
export const CAPTURE_LIMITS = Object.freeze({bytes: 4 * 1024 * 1024, records: 10000, sendBytes: 4096});
export const DEFAULT_SERIAL = Object.freeze({baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none', bufferSize: 4096});
export const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export function fromHex(value) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{2})*$/i.test(value)) throw Error('Invalid recorded hexadecimal bytes.');
  return Uint8Array.from(value.match(/../g) || [], h => parseInt(h, 16));
}
export function serialOptions(input = {}) {
  const o = {...DEFAULT_SERIAL, ...input};
  for (const k of ['baudRate', 'dataBits', 'stopBits', 'bufferSize']) o[k] = Number(o[k]);
  if (!Number.isInteger(o.baudRate) || o.baudRate < 50 || o.baudRate > 4000000) throw Error('Baud rate must be an integer from 50 to 4,000,000.');
  if (![7, 8].includes(o.dataBits) || ![1, 2].includes(o.stopBits)) throw Error('Choose 7 or 8 data bits and 1 or 2 stop bits.');
  if (!['none', 'even', 'odd'].includes(o.parity) || !['none', 'hardware'].includes(o.flowControl)) throw Error('Choose supported parity and flow control.');
  if (!Number.isInteger(o.bufferSize) || o.bufferSize < 256 || o.bufferSize > 65536) throw Error('Buffer size must be from 256 to 65,536 bytes.');
  return Object.fromEntries(Object.keys(DEFAULT_SERIAL).map(k => [k, o[k]]));
}
export const optionsLabel = o => `${o.baudRate} baud · ${o.dataBits}-${{none:'N',even:'E',odd:'O'}[o.parity]}-${o.stopBits} · ${o.flowControl === 'hardware' ? 'RTS/CTS' : 'no flow control'}`;
export function encodeSend(value, mode = 'text', ending = 'LF') {
  if (typeof value !== 'string') throw Error('Enter text or hexadecimal bytes.');
  if (mode === 'hex') {
    if (!/^[a-f0-9\s]*$/i.test(value)) throw Error('Hex accepts byte pairs and spaces only, for example 00 FF 0D 0A.');
    const compact = value.replace(/\s/g, '');
    if (compact.length % 2) throw Error('Complete every hexadecimal byte pair.');
    if (!compact.length) throw Error('Enter at least one hexadecimal byte.');
    if (compact.length / 2 > CAPTURE_LIMITS.sendBytes) throw Error('Send at most 4,096 bytes at a time.');
    return fromHex(compact);
  }
  if (mode !== 'text' || !['none', 'LF', 'CR', 'CRLF'].includes(ending)) throw Error('Choose a supported transmit format.');
  const bytes = new TextEncoder().encode(value + ({none:'', LF:'\n', CR:'\r', CRLF:'\r\n'})[ending]);
  if (!bytes.length) throw Error('Enter text or select a line ending.');
  if (bytes.length > CAPTURE_LIMITS.sendBytes) throw Error('Send at most 4,096 bytes at a time.');
  return bytes;
}
export function createCapture({id, deviceId, label, options, context = {}, createdAt = new Date().toISOString()}) {
  return {id, deviceId, label, createdAt, captureFormat: CAPTURE_FORMAT, options: serialOptions(options), context,
    status: 'capturing', lines: [], events: [], rxBytes: 0, txBytes: 0, attemptedTxBytes: 0, droppedBytes: 0, dataLoss: false};
}
export function captureStats(s) {
  const stats = {rx: 0, tx: 0, uncertain: 0, pending: 0, total: 0};
  if (s?.captureFormat !== CAPTURE_FORMAT) return stats;
  for (const l of s.lines) { const n = l.hex.length / 2; stats.total += n;
    if (l.dir === 'RX') stats.rx += n;
    else if (l.status === 'written') stats.tx += n;
    else if (l.status === 'pending') stats.pending += n;
    else stats.uncertain += n;
  }
  return stats;
}
export function rawCapture(s, direction) {
  if (s.captureFormat !== CAPTURE_FORMAT) throw Error('This legacy/text session has no byte-accurate capture. Download its transcript or original evidence.');
  if (!['RX','TX'].includes(direction)) throw Error('Choose RX or TX.');
  const parts = s.lines.filter(l => l.dir === direction && (direction === 'RX' || l.status === 'written')).map(l => fromHex(l.hex));
  const result = new Uint8Array(parts.reduce((n, b) => n + b.length, 0)); let offset = 0;
  for (const b of parts) { result.set(b, offset); offset += b.length; }
  return result;
}
const decoder = () => new TextDecoder('utf-8', {ignoreBOM: true});
export function rebuildCaptureText(s) {
  if (s.captureFormat !== CAPTURE_FORMAT) return;
  let d = decoder(), epoch = 0, previous;
  for (const line of s.lines) {
    if (line.dir === 'TX') { line.text = decoder().decode(fromHex(line.hex)); continue; }
    if (line.epoch !== epoch) { if (previous) previous.text += d.decode(); d = decoder(); epoch = line.epoch; }
    line.text = d.decode(fromHex(line.hex), {stream:true}); previous = line;
  }
  if (previous && !['capturing','stopping'].includes(s.status)) previous.text += d.decode();
}
export function validateCapture(s) {
  if (!s || s.captureFormat !== CAPTURE_FORMAT) throw Error('Unsupported serial capture format.');
  if (!s.options || typeof s.options !== 'object') throw Error('Capture connection settings are missing.');
  s.options = serialOptions(s.options);
  if (!Array.isArray(s.lines) || s.lines.length > CAPTURE_LIMITS.records || !Array.isArray(s.events) || s.events.length > 20000) throw Error('Serial capture record limit exceeded.');
  if (typeof s.label !== 'string' || typeof s.createdAt !== 'string' || !['capturing','stopping','closed','disconnected','error','limit','interrupted','snapshot'].includes(s.status)) throw Error('Invalid capture metadata.');
  let total = 0, epoch = 0;
  s.lines.forEach((l, i) => {
    if (l.seq !== i + 1 || !['RX','TX'].includes(l.dir) || typeof l.t !== 'string' || !Number.isFinite(Date.parse(l.t)) || !Number.isFinite(l.elapsedMs) || l.elapsedMs < 0) throw Error('Invalid serial record sequence or timestamp.');
    const bytes = fromHex(l.hex); total += bytes.length;
    if (!bytes.length || total > CAPTURE_LIMITS.bytes || l.byteLength !== bytes.length) throw Error('Invalid serial byte count or capture limit.');
    if (l.dir === 'RX') { if (l.status !== 'received' || !Number.isInteger(l.epoch) || l.epoch < epoch) throw Error('Invalid received-byte record.'); epoch = l.epoch; }
    else if (!['pending','written','uncertain'].includes(l.status)) throw Error('Invalid transmit status.');
  });
  for (const e of s.events) if (typeof e.text !== 'string' || typeof e.t !== 'string') throw Error('Invalid capture event.');
  rebuildCaptureText(s);
  return s;
}
export function recoverCapture(s, reason = 'Workspace reopened. The previous connection ended; bytes after the last local save may be missing.') {
  if (s.captureFormat !== CAPTURE_FORMAT || !['capturing','stopping'].includes(s.status)) return false;
  s.status = 'interrupted'; s.endedAt = new Date().toISOString(); s.dataLoss = true;
  for (const l of s.lines) if (l.status === 'pending') l.status = 'uncertain';
  s.events.push({t:s.endedAt, text:reason}); rebuildCaptureText(s); return true;
}
// Logical RX lines span read chunks. TX attempts remain separate records.
export function sessionRows(s) {
  if (!s) return [];
  if (s.captureFormat !== CAPTURE_FORMAT) return s.lines.map((l,i) => ({...l, seq:i+1, text:l.text}));
  const rows = []; let pending = null, afterCR = false, epoch = 0;
  const flush = () => { if (pending) rows.push(pending); pending = null; };
  for (const l of s.lines) {
    if (l.dir === 'TX') { rows.push({...l}); continue; }
    if (l.epoch !== epoch) { flush(); afterCR = false; epoch = l.epoch; }
    for (const c of l.text) {
      if (afterCR && c === '\n') { afterCR = false; continue; }
      afterCR = false;
      if (!pending) pending = {dir:'RX', status:'received', t:l.t, seq:l.seq, text:''};
      if (c === '\r' || c === '\n') { flush(); afterCR = c === '\r'; }
      else pending.text += c;
    }
  }
  flush(); return rows.sort((a,b) => a.seq - b.seq);
}
export const visibleText = text => String(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, c => `\\x${c.charCodeAt(0).toString(16).padStart(2,'0')}`);
export function transcript(s) {
  const header = [`PROBE serial transcript · ${s.label}`, `Created: ${s.createdAt}`, `Session: ${s.id}`, `Status: ${s.status || 'legacy / imported'}`];
  if (s.options) header.push(optionsLabel(s.options));
  if (s.context?.deviceName) header.push(`Device: ${s.context.deviceName} · Firmware: ${s.context.firmware || 'unknown'}`);
  header.push('Timestamps are host capture times. TX written means accepted by the browser stream, not acknowledged by the device.');
  if (s.dataLoss) header.push('INCOMPLETE: capture contains a reported gap, uncertain shutdown or dropped bytes.');
  return header.join('\n')+'\n\n'+sessionRows(s).map(l => `[${l.t}] ${l.dir}${l.dir === 'TX' ? ` ${l.status || ''}` : ''} ${visibleText(l.text)}`).join('\n')+'\n\nEVENTS\n'+s.events.map(e=>`[${e.t}] ${e.text}`).join('\n');
}

export class SerialConnection {
  constructor(port, session, {onChange = () => {}, onState = () => {}, clock = () => new Date().toISOString(), monotonic = () => performance.now(), limits = CAPTURE_LIMITS} = {}) {
    this.port = port; this.session = session; this.onChange = onChange; this.onState = onState;
    this.clock = clock; this.monotonic = monotonic; this.limits = limits; this.state = 'idle'; this.decoder = decoder(); this.epoch = 0;
    this.total = 0; this.stopReason = null; this.reader = null; this.writer = null; this.pendingWrite = null;
    this.disconnected = () => { this.session.dataLoss = true; this.stop('disconnected', 'Adapter disconnected. Capture after this event is unavailable.'); };
  }
  event(text) { this.session.events.push({t:this.clock(), text}); this.onChange(); }
  setState(state) { this.state = state; this.onState(state); }
  async open() {
    if (this.state !== 'idle') throw Error('This connection has already been opened.');
    this.setState('opening');
    try { await this.port.open(serialOptions(this.session.options)); }
    catch (error) { this.setState('error'); throw error; }
    this.startTime = this.monotonic();
    this.port.addEventListener?.('disconnect', this.disconnected);
    try { this.session.adapter = {...this.port.getInfo()}; } catch { this.session.adapter = {}; }
    this.event(`Port opened · ${optionsLabel(this.session.options)}`);
    this.setState('connected');
  }
  start() {
    if (this.done) return this.done;
    if (this.state !== 'connected') throw Error('Open the port before capture.');
    this.done = this.readLoop(); return this.done;
  }
  append(bytes, dir, status) {
    const line = {seq:this.session.lines.length+1, t:this.clock(), elapsedMs:Math.max(0,this.monotonic()-this.startTime), dir, status,
      byteLength:bytes.length, hex:toHex(bytes), text:dir === 'RX' ? this.decoder.decode(bytes,{stream:true}) : decoder().decode(bytes)};
    if (dir === 'RX') line.epoch = this.epoch;
    this.session.lines.push(line); this.total += bytes.length;
    if (dir === 'RX') this.session.rxBytes += bytes.length; else this.session.attemptedTxBytes += bytes.length;
    this.onChange(); return line;
  }
  flushDecoder() {
    const tail = this.decoder.decode();
    if (tail) { const last = this.session.lines.findLast(l=>l.dir==='RX' && l.epoch===this.epoch); if (last) last.text += tail; }
    this.decoder = decoder();
  }
  receive(bytes) {
    const room = this.session.lines.length >= this.limits.records ? 0 : Math.max(0,this.limits.bytes-this.total);
    const take = Math.min(room,bytes.length);
    if (take) this.append(bytes.subarray(0,take), 'RX','received');
    if (take < bytes.length) { this.session.droppedBytes += bytes.length-take; this.session.dataLoss = true; }
    if (take < bytes.length || this.total >= this.limits.bytes || this.session.lines.length >= this.limits.records) {
      this.stopReason = 'limit'; this.event(`Capture limit reached. ${bytes.length-take} bytes from this read were not retained; subsequent device output is not captured.`);
      this.session.dataLoss = true;
    }
  }
  async readLoop() {
    try {
      while (!this.stopReason && this.port.readable) {
        const stream = this.port.readable; this.reader = stream.getReader();
        try {
          while (!this.stopReason) {
            const {value,done} = await this.reader.read();
            if (done) { if (!this.stopReason) { this.stopReason = 'disconnected'; this.session.dataLoss = true; this.event('Receive stream ended. Reconnect deliberately to start another session.'); } break; }
            if (value?.length) this.receive(value);
          }
        } catch (error) {
          if (!this.stopReason) {
            this.session.dataLoss = true; this.event(`Receive error (${error.name || 'Error'}): ${error.message}. Bytes may be missing.`);
            this.flushDecoder(); this.epoch++;
            if (!this.port.readable || this.port.readable === stream) this.stopReason = 'error';
          }
        } finally { this.reader.releaseLock(); this.reader = null; }
      }
      if (!this.stopReason) { this.stopReason = 'disconnected'; this.session.dataLoss = true; }
    } catch (error) { this.stopReason = 'error'; this.session.dataLoss = true; this.event(`Capture error: ${error.message}`); }
    finally { await this.finish(); }
  }
  async send(bytes) {
    if (this.state !== 'connected' || this.stopReason || !this.port.writable) throw Error('Connect an adapter before sending.');
    if (this.pendingWrite) throw Error('A transmission is still pending. Wait or disconnect; commands are never queued.');
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > this.limits.sendBytes) throw Error('Send between 1 and 4,096 bytes.');
    if (this.total+bytes.length > this.limits.bytes || this.session.lines.length >= this.limits.records) throw Error('Capture is full. Export it and start a new session before sending.');
    bytes = bytes.slice();
    this.writer = this.port.writable.getWriter();
    const line = this.append(bytes, 'TX', 'pending');
    this.pendingWrite = (async () => {
      try { await this.writer.write(bytes); line.status = 'written'; this.session.txBytes += bytes.length; }
      catch (error) { line.status = 'uncertain'; this.session.dataLoss = true; this.event(`TX result uncertain: ${error.message}. Some bytes may have reached the device; no retry was sent.`); throw error; }
      finally { this.writer.releaseLock(); this.writer = null; this.pendingWrite = null; this.onChange(); }
    })();
    return this.pendingWrite;
  }
  stop(reason = 'closed', message = 'Operator disconnected. Buffered device bytes after cancellation may not be captured.') {
    if (this.state === 'closed' || this.state === 'error') return this.done || Promise.resolve();
    if (!this.stopReason) { this.stopReason = reason; this.event(message); }
    this.session.status = 'stopping'; this.setState('stopping');
    this.reader?.cancel().catch(()=>{});
    if (this.writer) this.writer.abort('Connection stopping').catch(()=>{});
    if (!this.done) this.done = this.finish();
    return this.done;
  }
  async finish() {
    this.session.status = 'stopping'; this.setState('stopping');
    // Abort a pending write before waiting for its owner to release the lock.
    if (this.writer) this.writer.abort('Capture ended').catch(()=>{});
    if (this.pendingWrite) await this.pendingWrite.catch(()=>{});
    this.flushDecoder();
    try { await this.port.close(); }
    catch (error) { this.event(`Adapter close reported: ${error.message}`); }
    this.port.removeEventListener?.('disconnect', this.disconnected);
    this.session.status = this.stopReason || 'closed'; this.session.endedAt = this.clock();
    this.event(`Capture ended · ${this.session.status}. Reconnection creates a new session.`);
    this.setState('closed');
  }
}
