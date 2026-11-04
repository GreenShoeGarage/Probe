import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPTURE_FORMAT,SerialConnection,createCapture,serialOptions,encodeSend,rawCapture,toHex,fromHex,sessionRows,validateCapture,recoverCapture,captureStats,transcript} from '../dist/serial.js';
import {newProject,validateProject,sha256} from '../dist/core.js';

const tick = () => new Promise(resolve=>setImmediate(resolve));
async function until(predicate) { for(let i=0;i<1000;i++){if(predicate())return;await tick();}throw Error('Condition did not settle'); }
class Port extends EventTarget {
  constructor({writeFailure=false,blocked=false}={}) { super();this.writes=[];this.closed=0;this.writeFailure=writeFailure;this.blocked=blocked; }
  makeReader(){this.readable=new ReadableStream({start:c=>this.rx=c,cancel:()=>{this.readable=null;this.cancelled=true;}});}
  async open(options){this.options=options;this.makeReader();this.writable=new WritableStream({write:async(bytes,controller)=>{
    this.writes.push(bytes.slice());
    if(this.writeFailure)throw Error('adapter lost during write');
    if(this.blocked)await new Promise((resolve,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('write interrupted')),{once:true}));
  }});}
  getInfo(){return {usbVendorId:0x1234,usbProductId:0x5678};}
  async close(){assert(!this.readable?.locked,'read lock must be released');assert(!this.writable?.locked,'write lock must be released');this.closed++;this.readable=null;this.writable=null;}
  receive(bytes){this.rx.enqueue(bytes);}
  fail(recoverable=false){const old=this.rx;if(recoverable)this.makeReader();else this.readable=null;old.error(new DOMException('framing / disconnected','NetworkError'));}
  unplug(){this.dispatchEvent(new Event('disconnect'));}
}
async function connection(port=new Port(),extra={}){
  const s=createCapture({id:'session_test',deviceId:'dev_test',label:'Fixture',options:serialOptions()});
  const c=new SerialConnection(port,s,extra);await c.open();c.start();return {c,s,port};
}
test('send encoding is exact for every ending and binary hex; invalid inputs fail before I/O',()=>{
  for(const [ending,suffix] of Object.entries({none:[],LF:[10],CR:[13],CRLF:[13,10]}))assert.deepEqual([...encodeSend('A','text',ending)],[65,...suffix]);
  assert.deepEqual([...encodeSend('00 ff 0D\n0a','hex','CRLF')],[0,255,13,10]);
  assert.deepEqual([...encodeSend('','text','CR')],[13]);
  for(const [value,mode,ending] of [['0','hex','none'],['0x12','hex','none'],['zz','hex','none'],['','text','none'],['a','text','bogus'],['A'.repeat(4097),'text','none']])assert.throws(()=>encodeSend(value,mode,ending));
  assert.throws(()=>serialOptions({dataBits:5}));assert.throws(()=>serialOptions({baudRate:NaN}));
  assert.equal(serialOptions({dataBits:'7',stopBits:'2',parity:'even',flowControl:'hardware'}).dataBits,7);
});
test('split UTF-8 and CRLF reads preserve bytes and reconstruct complete logical lines',async()=>{
  const {c,s,port}=await connection();const bytes=new TextEncoder().encode('boot € ready\r\nline two\nlast');
  for(const b of bytes)port.receive(Uint8Array.of(b));await until(()=>s.rxBytes===bytes.length);await c.stop();
  assert.deepEqual(rawCapture(s,'RX'),bytes);assert.deepEqual(sessionRows(s).map(l=>l.text),['boot € ready','line two','last']);
  assert.equal(s.lines.length,bytes.length);assert.equal(s.lines.at(-1).seq,bytes.length);assert.equal(port.closed,1);
  assert.equal(validateCapture(JSON.parse(JSON.stringify(s))).captureFormat,CAPTURE_FORMAT);
});
test('binary RX and final incomplete UTF-8 keep their exact bytes through close and project round-trip',async()=>{
  const {c,s,port}=await connection();const bytes=Uint8Array.from([0,255,13,10,0xE2,0x82]);port.receive(bytes);await until(()=>s.rxBytes===bytes.length);await c.stop();
  assert(s.lines.at(-1).text.endsWith('�'));assert.deepEqual(rawCapture(s,'RX'),bytes);
  const p=newProject();s.deviceId=p.deviceId;p.sessions.push(s);const imported=validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(await sha256(rawCapture(imported.sessions[0],'RX')),await sha256(bytes));
  assert.match(transcript(s),/\\x00/);
});
test('TX writes use separate records, preserve all bytes and never replay after reconnect',async()=>{
  const {c,s,port}=await connection();const data=Uint8Array.of(0,255,65,10);const work=c.send(data);data[0]=9;await work;await c.stop();
  assert.deepEqual([...port.writes[0]],[0,255,65,10]);assert.deepEqual(rawCapture(s,'TX'),port.writes[0]);assert.equal(s.lines[0].status,'written');assert.equal(s.txBytes,4);
  const next=await connection(port);assert.equal(port.writes.length,1);assert.equal(next.s.lines.length,0);await next.c.stop();
});
test('write failures preserve attempted bytes as uncertain and exclude them from accepted-TX export',async()=>{
  const {c,s}=await connection(new Port({writeFailure:true}));await assert.rejects(c.send(Uint8Array.of(1,2,3)),/adapter lost/);
  assert.equal(s.lines[0].hex,'010203');assert.equal(s.lines[0].status,'uncertain');assert.equal(rawCapture(s,'TX').length,0);assert.equal(captureStats(s).uncertain,3);assert(s.dataLoss);await c.stop();
});
test('disconnect aborts a pending write, releases locks and retains uncertain transmission',async()=>{
  const {c,s,port}=await connection(new Port({blocked:true}));const work=c.send(Uint8Array.of(65)).catch(e=>e);await until(()=>port.writes.length===1);
  await c.stop();assert(await work instanceof Error);assert.equal(s.lines[0].status,'uncertain');assert.equal(port.closed,1);assert.equal(c.state,'closed');
});
test('concurrent send is rejected instead of queued and unplug preserves the completed RX prefix',async()=>{
  const {c,s,port}=await connection(new Port({blocked:true}));port.receive(Uint8Array.of(65,66));await until(()=>s.rxBytes===2);
  const work=c.send(Uint8Array.of(1)).catch(()=>{});await until(()=>port.writes.length===1);await assert.rejects(c.send(Uint8Array.of(2)),/never queued/);
  port.unplug();await c.done;await work;assert.equal(s.status,'disconnected');assert.equal(port.writes.length,1);assert.equal(toHex(rawCapture(s,'RX')),'4142');assert(s.dataLoss);
});
test('recoverable read errors record a gap and reset text decoding before continuing',async()=>{
  const {c,s,port}=await connection();port.receive(Uint8Array.of(0xe2));await until(()=>s.rxBytes===1);port.fail(true);await until(()=>s.events.some(e=>e.text.includes('Receive error')));
  port.receive(new TextEncoder().encode('new line\n'));await until(()=>s.rxBytes===10);await c.stop();
  assert.deepEqual(sessionRows(s).map(l=>l.text),['�','new line']);assert.equal(s.lines[1].epoch,1);assert(s.dataLoss);assert.equal(toHex(rawCapture(s,'RX')),'e26e6577206c696e650a');
});
test('fatal read errors preserve data and close the adapter exactly once',async()=>{
  const {c,s,port}=await connection();port.receive(Uint8Array.of(1,2));await until(()=>s.rxBytes===2);port.fail();await c.done;await c.stop();assert.equal(s.status,'error');assert.equal(port.closed,1);assert.equal(rawCapture(s,'RX').length,2);
});
test('capture limit keeps the available prefix and reports known dropped bytes',async()=>{
  const {c,s,port}=await connection(new Port(),{limits:{bytes:5,records:10,sendBytes:4}});port.receive(Uint8Array.of(1,2,3,4,5,6,7));await c.done;
  assert.deepEqual([...rawCapture(s,'RX')],[1,2,3,4,5]);assert.equal(s.droppedBytes,2);assert.equal(s.status,'limit');assert(s.dataLoss);
});
test('record limit terminates continuous single-byte traffic and TX cannot exceed available evidence capacity',async()=>{
  const {c,s,port}=await connection(new Port(),{limits:{bytes:5,records:2,sendBytes:4}});await c.send(Uint8Array.of(1,2,3,4));await assert.rejects(c.send(Uint8Array.of(5,6)),/full/);port.receive(Uint8Array.of(8));await c.done;assert.equal(s.lines.length,2);assert.equal(s.status,'limit');
});
test('interrupted saved captures recover with pending TX uncertain and raw-derived display text',async()=>{
  const {c,s,port}=await connection();port.receive(Uint8Array.of(0xe2));await until(()=>s.rxBytes===1);const copy=JSON.parse(JSON.stringify(s));copy.lines[0].text='misleading';validateCapture(copy);assert.equal(copy.lines[0].text,'');assert(recoverCapture(copy));assert.equal(copy.lines[0].text,'�');assert.equal(copy.status,'interrupted');assert.equal(recoverCapture(copy),false);await c.stop();
});
test('capture import rejects malformed raw bytes, out-of-order records and invalid settings',async()=>{
  const {c,s,port}=await connection();port.receive(Uint8Array.of(65));await until(()=>s.rxBytes===1);await c.stop();
  for(const change of [q=>q.lines[0].hex='zz',q=>q.lines[0].seq=5,q=>q.lines[0].byteLength=3,q=>q.options.dataBits=9,q=>q.lines[0].status='written']){const q=structuredClone(s);change(q);assert.throws(()=>validateCapture(q));}
  assert.throws(()=>rawCapture({lines:[]},'RX'),/legacy/);assert.throws(()=>fromHex('a'),/hexadecimal/);
});
