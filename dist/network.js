import {canonicalIP,destinationSet} from './ip.js';
import {sha256} from './core.js';
export const SCAN_FORMAT='probe-native-scan-v1';
export function parseNmap(text,profile=null){
  const clean=text.replace(/<!DOCTYPE\s+nmaprun\s*>/g,'');if(/<!DOCTYPE|<!ENTITY/i.test(clean))throw Error('External or custom XML declarations are not supported.');
  const doc=new DOMParser().parseFromString(clean,'application/xml');if(doc.querySelector('parsererror')||doc.documentElement.nodeName!=='nmaprun')throw Error('XML is incomplete or is not a valid Nmap result. Originals remain available.');
  const attr=(n,k)=>n?.getAttribute(k)||'',root=doc.documentElement,finished=doc.querySelector('runstats > finished'),hosts=[...doc.querySelectorAll('nmaprun > host')],observations=[],hostObservations=[],mode=profile?.mode||'tcp',protocol=mode==='udp'?'udp':'tcp',destinations=profile?destinationSet(profile.targets):null;
  const zone=profile?.targets[0]?.split('%')[1],address=h=>{const raw=attr(h.querySelector('address[addrtype="ipv4"],address[addrtype="ipv6"]'),'addr');if(!raw)return '';return canonicalIP(raw+(!raw.includes('%')&&zone&&/^fe[89ab]/i.test(raw)?'%'+zone:''));};
  let complete=attr(finished,'exit')==='success';const addresses=hosts.map(address).filter(Boolean);
  if(profile){if(new Set(addresses).size!==addresses.length)throw Error('Duplicate host observations.');if(addresses.some(a=>!destinations.includes(a)))throw Error('XML observations exceed the recorded scan profile.');complete=complete&&JSON.stringify(addresses.slice().sort())===JSON.stringify(destinations.slice().sort());
    if(mode!=='discovery'){const info=doc.querySelector('scaninfo'),ports=[];for(const item of attr(info,'services').split(',')){if(!/^\d+(-\d+)?$/.test(item)){complete=false;break;}const [a,b=a]=item.split('-').map(Number);if(b<a||b-a>256){complete=false;break;}for(let p=a;p<=b;p++)ports.push(p);}complete=complete&&attr(info,'type')===(mode==='udp'?'udp':'connect')&&attr(info,'protocol')===protocol&&JSON.stringify(ports.sort((a,b)=>a-b))===JSON.stringify(profile.ports);}
  }
  for(const h of hosts){const host=address(h);if(!host)continue;const state=attr(h.querySelector('status'),'state')||'unknown';hostObservations.push({host,state,reason:attr(h.querySelector('status'),'reason')});if(attr(h,'timedout')==='true'||!['up','down'].includes(state)||mode!=='discovery'&&state!=='up')complete=false;
    const explicit=[];for(const p of h.querySelectorAll('ports > port')){const port=Number(attr(p,'portid')),proto=attr(p,'protocol'),svc=p.querySelector('service');if(!Number.isInteger(port)||port<1||port>65535||!['tcp','udp','sctp'].includes(proto))continue;if(profile&&(mode==='discovery'||!profile.ports.includes(port)||proto!==protocol))throw Error('XML observations exceed the recorded scan profile.');if(explicit.includes(proto+':'+port))throw Error('Duplicate port observation.');explicit.push(proto+':'+port);observations.push({host,port,protocol:proto,state:attr(p.querySelector('state'),'state')||'unknown',reason:attr(p.querySelector('state'),'reason'),name:attr(svc,'name'),version:['product','version','extrainfo'].map(k=>attr(svc,k)).filter(Boolean).join(' '),method:attr(svc,'method')||'unspecified',confidence:attr(svc,'conf')});}
    if(profile&&complete&&mode!=='discovery'){const rest=profile.ports.filter(p=>!explicit.includes(protocol+':'+p)),groups=[...h.querySelectorAll('ports > extraports')];if(rest.length&&groups.length===1&&Number(attr(groups[0],'count'))===rest.length){const state=attr(groups[0],'state');if(['closed','filtered','open|filtered','closed|filtered','unfiltered'].includes(state))for(const port of rest)observations.push({host,port,protocol,state,name:'',version:'',method:'aggregate',reason:'Nmap aggregate accounts for every remaining requested port'});}}
  }
  if(profile&&mode!=='discovery'&&observations.length!==profile.targets.length*profile.ports.length)complete=false;if(observations.length>20000||hostObservations.length>20000)throw Error('XML observation limit exceeded.');return {observations,hostObservations,complete,tool:`${attr(root,'scanner')||'Nmap'} ${attr(root,'version')}`,args:attr(root,'args')};
}
export function base64Bytes(text){if(typeof text!=='string'||text.length>6*1024*1024||text.length%4!==0||/[^A-Za-z0-9+/=]/.test(text)||/=/.test(text.slice(0,-2))||text.endsWith('=')&&!/^[A-Za-z0-9+/][A-Za-z0-9+/=]=$/.test(text.slice(-3)))throw Error('Invalid scan output encoding.');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
export async function validateScanEnvelope(e){
  if(e?.format!==SCAN_FORMAT||!e.job||! /^[a-f0-9-]{36}$/.test(e.job.id))throw Error('Choose a PROBE native scan JSON export.');
  const j=e.job,p=j.profile;if(!p||!Array.isArray(p.targets)||!p.targets.length||p.targets.length>64||p.targets.some(x=>typeof x!=='string')||!Array.isArray(p.ports)||!p.ports.length||p.ports.length>256||p.ports.some(n=>!Number.isInteger(n)||n<1||n>65535)||typeof p.serviceDetection!=='boolean')throw Error('Invalid recorded scan profile.');
  if(p.targets.length*p.ports.length>4096||new Set(p.targets).size!==p.targets.length||new Set(p.ports).size!==p.ports.length)throw Error('Invalid scan destination set.');
  destinationSet(p.targets);if(p.mode!==undefined&&!['tcp','udp','discovery'].includes(p.mode))throw Error('Invalid scan mode.');if(p.mode&&p.mode!=='tcp'&&(p.targets.length>16||p.ports.length>16||p.serviceDetection))throw Error('Recorded expanded scan exceeds supported bounds.');
  if(!['completed','failed','cancelled','interrupted','timed-out','output-limit','storage-error'].includes(j.status))throw Error('Only finished scan records can be imported.');
  for(const k of ['projectId','deviceId','label','startedAt','tool'])if(typeof j[k]!=='string')throw Error('Invalid scan metadata.');
  const xml=base64Bytes(e.xmlBase64),stderr=base64Bytes(e.stderrBase64);
  if(xml.length>4*1024*1024||stderr.length>256*1024||xml.length!==j.xmlBytes||stderr.length!==j.stderrBytes||await sha256(xml)!==j.xmlHash||await sha256(stderr)!==j.stderrHash)throw Error('Scan output hash or length does not match the record.');
  return {xml,stderr};
}
export function compareScans(before,after){
  if(before.deviceId!==after.deviceId)throw Error('Select scans for the same device.');
  const modeA=before.profile.mode||'tcp',modeB=after.profile.mode||'tcp';
  const same=modeA===modeB&&JSON.stringify(destinationSet(before.profile.targets).sort())===JSON.stringify(destinationSet(after.profile.targets).sort())&&JSON.stringify(before.profile.ports)===JSON.stringify(after.profile.ports)&&before.profile.serviceDetection===after.profile.serviceDetection;
  if(modeA==='discovery'||modeB==='discovery'){const a=new Map((before.hostObservations||[]).map(h=>[h.host,h])),b=new Map((after.hostObservations||[]).map(h=>[h.host,h])),changes=[];for(const host of new Set([...a.keys(),...b.keys()])){const A=a.get(host),B=b.get(host);if(!A||!B||A.state!==B.state)changes.push({endpoint:host,detail:!B?'Not observed later; no down-state inference.':!A?'New host observation: '+B.state:A.state+' → '+B.state});}return {sameScope:same,complete:before.complete&&after.complete,changes};}
  const key=x=>`${canonicalIP(x.host)} ${x.protocol}/${x.port}`,a=new Map(before.observations.map(x=>[key(x),x])),b=new Map(after.observations.map(x=>[key(x),x])),changes=[];
  for(const [k,row] of b){const old=a.get(k);if(!old){changes.push({endpoint:k,detail:`New observation: ${row.state}`});continue;}for(const f of ['state','name','version','method'])if((old[f]||'')!==(row[f]||''))changes.push({endpoint:k,detail:`${f}: ${old[f]||'—'} → ${row[f]||'—'}`});}
  for(const [k] of a)if(!b.has(k))changes.push({endpoint:k,detail:'Not observed in later scan; closure is not established.'});
  return {sameScope:same,complete:before.complete&&after.complete,changes};
}
