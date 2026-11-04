import {EventEmitter} from 'node:events';

// Parse MI values, not JavaScript or a CLI expression. Nested lists and C escapes matter.
export function parseMI(line){
  const head=/^(\d*)([\^*+=~@&])(.*)$/.exec(line.trim());if(!head)return null;
  let text=head[3],pos=0,depth=0;
  const key=()=>{const m=/^[a-zA-Z_][a-zA-Z0-9_-]*/.exec(text.slice(pos));if(!m)throw Error('Invalid MI key');pos+=m[0].length;return m[0]};
  const quoted=()=>{if(text[pos++]!=='"')throw Error('Expected MI string');let out='';while(pos<text.length){let c=text[pos++];if(c==='"')return out;if(c==='\\'){c=text[pos++];const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v',a:'\x07','\\':'\\','"':'"'};if(/[0-7]/.test(c)){let oct=c;for(let i=0;i<2&&/[0-7]/.test(text[pos]||'x');i++)oct+=text[pos++];c=String.fromCharCode(parseInt(oct,8));}else c=escapes[c]??c;}out+=c;}throw Error('Unterminated MI string');};
  const result=()=>{const k=key();if(text[pos++]!=='=')throw Error('Expected MI result');return [k,value()]};
  const put=(obj,k,v)=>{if(Object.hasOwn(obj,k)){obj[k]=Array.isArray(obj[k])?[...obj[k],v]:[obj[k],v]}else obj[k]=v;};
  const value=()=>{if(++depth>32)throw Error('MI nesting limit');let v;if(text[pos]==='"')v=quoted();else if(text[pos]==='{'){pos++;v=Object.create(null);while(text[pos]!=='}'){const [k,x]=result();put(v,k,x);if(text[pos]!==',')break;pos++;}if(text[pos++]!=='}')throw Error('Invalid MI tuple');}else if(text[pos]==='['){pos++;v=[];while(text[pos]!==']'){if(text[pos]==='"'||text[pos]==='{'||text[pos]==='[')v.push(value());else{const [k,x]=result();v.push({[k]:x});}if(text[pos]!==',')break;pos++;}if(text[pos++]!==']')throw Error('Invalid MI list');}else throw Error('Unsupported MI value');depth--;return v;};
  if('~@&'.includes(head[2]))return {token:head[1],kind:head[2],text:quoted()};
  const cls=key(),data=Object.create(null);if(text[pos]===','){pos++;while(pos<text.length){const [k,v]=result();put(data,k,v);if(text[pos]!==',')break;pos++;}}
  if(pos!==text.length)throw Error('Trailing MI content');return {token:head[1],kind:head[2],class:cls,data};
}

export class MIClient extends EventEmitter{
  constructor(child,{onRaw=()=>{},timeout=6000,maxLine=4*1024*1024}={}){
    super();this.child=child;this.onRaw=onRaw;this.timeout=timeout;this.maxLine=maxLine;this.sequence=0;this.pending=new Map();this.buffer='';this.dead=false;
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{onRaw('gdb-out',chunk);this.buffer+=chunk;if(this.buffer.length>maxLine&&!this.buffer.includes('\n'))return this.fail(Error('GDB line exceeded output limit'));let end;while((end=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,end).replace(/\r$/,'');this.buffer=this.buffer.slice(end+1);if(line.length>maxLine){this.fail(Error('GDB line exceeded output limit'));break;}try{const r=parseMI(line);if(!r)continue;if(r.kind==='^'){const p=this.pending.get(r.token);if(p){clearTimeout(p.timer);this.pending.delete(r.token);r.class==='error'?p.reject(Error(r.data.msg||'GDB command failed')):p.resolve(r);}}this.emit('record',r);}catch(e){this.fail(Error('Malformed GDB/MI response: '+e.message));break;}}});
    child.stderr.on('data',b=>onRaw('gdb-err',b.toString()));child.once('error',e=>this.fail(e));child.once('close',()=>this.fail(Error('GDB process disconnected')));
  }
  fail(error){if(this.dead)return;this.dead=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error)}this.pending.clear();this.emit('fault',error);}
  command(command){if(this.dead)return Promise.reject(Error('GDB is not connected'));const token=String(++this.sequence);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.fail(Error('GDB command timed out; target state is unknown')),this.timeout);this.pending.set(token,{resolve,reject,timer});this.onRaw('gdb-in',token+command+'\n');this.child.stdin.write(token+command+'\n',e=>{if(e)this.fail(e)});});}
}
