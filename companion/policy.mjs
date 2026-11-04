// Structured numeric target policy; IPv6 uses explicit hosts only.
import {canonicalIP} from '../dist/ip.js';
export const LIMITS = Object.freeze({hosts:64,ports:256,pairs:4096,xml:4*1024*1024,stderr:256*1024,jobs:20});
export function ipNumber(text) {
  if(typeof text!=='string'||! /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(text))throw Error('Use canonical numeric IPv4 addresses.');
  const parts=text.split('.').map(Number);
  if(parts.some(n=>n>255)||parts[0]===0||parts[0]>=224)throw Error('Unspecified, multicast and reserved target ranges are not supported.');
  return parts.reduce((a,n)=>a*256+n,0);
}
export const ipText=n=>[24,16,8,0].map(s=>(n>>>s)&255).join('.');
export function range(text,minPrefix=16) {
  const parts=String(text).split('/');if(parts.length>2)throw Error('Invalid IPv4 scope.');
  const n=ipNumber(parts[0]),prefix=parts.length===1?32:Number(parts[1]);
  if(parts.length===2&&! /^(0|[1-9]\d?)$/.test(parts[1])||!Number.isInteger(prefix)||prefix<minPrefix||prefix>32)throw Error(`Use IPv4 CIDRs /${minPrefix} through /32.`);
  const size=2**(32-prefix),start=Math.floor(n/size)*size,end=start+size-1;
  ipNumber(ipText(start));ipNumber(ipText(end));
  return {start,end,text:prefix===32?ipText(start):`${ipText(start)}/${prefix}`};
}
const tokens=s=>String(s).trim().split(/[\s,]+/).filter(Boolean);
export function allowedRanges(text='127.0.0.1') {
  const entries=tokens(text);if(!entries.length||entries.length>32)throw Error('Supply 1–32 allowed IPv4/CIDRs or explicit IPv6 addresses.');
  return entries.map(s=>s.includes(':')?{family:6,address:canonicalIP(s),text:canonicalIP(s)}:range(s));
}
export function portList(text) {
  if(typeof text!=='string'||text.length>2000)throw Error('Enter numeric ports or ranges.');
  const ports=new Set();for(const item of tokens(text)){
    if(!/^\d{1,5}(-\d{1,5})?$/.test(item))throw Error('Ports must be numeric, for example 22,80,443 or 8000-8010.');
    const [start,end=start]=item.split('-').map(Number);
    if(start<1||end>65535||end<start||end-start>=LIMITS.ports)throw Error('Use ports 1–65535, up to 256 selected ports.');
    for(let p=start;p<=end;p++)ports.add(p);if(ports.size>LIMITS.ports)throw Error('Select at most 256 ports.');
  }
  if(!ports.size)throw Error('Select at least one port.');return [...ports].sort((a,b)=>a-b);
}
export function normalizeProfile(input,allowed,features={udp:false}) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('A structured scan profile is required.');
  for(const key of Object.keys(input))if(!['targets','ports','rate','timeout','serviceDetection','vantage','projectId','deviceId','label','mode'].includes(key))throw Error('Unknown scan option: '+key);
  const mode=input.mode??'tcp';if(!['tcp','udp','discovery'].includes(mode))throw Error('Choose TCP, UDP or host discovery.');if(mode==='udp'&&!features.udp)throw Error('UDP is disabled. Start the companion with --udp enabled after configuring Nmap privileges on the assessment host.');
  if(typeof input.targets!=='string'||input.targets.length>2048)throw Error('Enter numeric IPv4 or exact IPv6 targets.');
  const hosts=new Set();let family=null;for(const item of tokens(input.targets)){
    const next=item.includes(':')?6:4;if(family&&family!==next)throw Error('Use one address family per scan.');family=next;
    if(next===6){const address=canonicalIP(item);if(!allowed.some(a=>a.family===6&&a.address===address))throw Error(`Target ${address} is outside the companion allowlist.`);hosts.add(address);if(hosts.size>LIMITS.hosts)throw Error('Select at most 64 hosts.');continue;}
    const r=range(item,26);for(let n=r.start;n<=r.end;n++){
      if(!allowed.some(a=>a.family!==6&&n>=a.start&&n<=a.end))throw Error(`Target ${ipText(n)} is outside the companion allowlist.`);
      hosts.add(n);if(hosts.size>LIMITS.hosts)throw Error('Select at most 64 hosts.');
    }
  }
  if(!hosts.size)throw Error('Select at least one target.');const ports=portList(input.ports);
  if(hosts.size*ports.length>LIMITS.pairs)throw Error('Limit each job to 4,096 host/port pairs.');
  const scoped=[...hosts].filter(x=>typeof x==='string'&&x.includes('%'));if(scoped.length&&(scoped.length!==hosts.size||new Set(scoped.map(s=>s.split('%')[1])).size!==1))throw Error('Use one link-local interface and no global targets in the same scan.');
  if(mode!=='tcp'&&(hosts.size>16||ports.length>16))throw Error('UDP/discovery is limited to 16 hosts and 16 ports.');
  if(mode!=='tcp'&&input.serviceDetection)throw Error('Service/version probes are only available in TCP mode.');
  const rate=input.rate??20,timeout=input.timeout??120;
  if(!Number.isInteger(rate)||rate<1||rate>100)throw Error('Configured scan rate must be 1–100 probes/second.');
  if(!Number.isInteger(timeout)||timeout<10||timeout>300)throw Error('Job timeout must be 10–300 seconds.');
  if(mode!=='tcp'&&rate>20)throw Error('UDP/discovery rate ceiling is 20 probes/second.');
  if(typeof input.serviceDetection!=='boolean')throw Error('Choose whether to enable service detection.');
  for(const key of ['projectId','deviceId'])if(typeof input[key]!=='string'||! /^[a-z0-9_-]{1,100}$/i.test(input[key]))throw Error('Project and device identities are required.');
  if(typeof input.vantage!=='string'||!input.vantage.trim()||input.vantage.length>1000)throw Error('Record the vantage point and device state (up to 1,000 characters).');
  if(typeof input.label!=='string'||!input.label.trim()||input.label.length>160)throw Error('Supply a scan label (up to 160 characters).');
  return {mode,targets:family===6?[...hosts].sort():[...hosts].sort((a,b)=>a-b).map(ipText),ports,rate,timeout,serviceDetection:input.serviceDetection,vantage:input.vantage.trim(),projectId:input.projectId,deviceId:input.deviceId,label:input.label.trim()};
}
export function nmapArgs(p) {
  const mode=p.mode||'tcp',zone=p.targets[0].split('%')[1];
  return [...(p.targets[0].includes(':')?['-6']:[]),...(zone?['-e',zone]:[]),...(mode==='udp'?['--privileged','-sU','-Pn']:mode==='discovery'?['--unprivileged','-sn','-PS'+p.ports.join(',')]:['--unprivileged','-sT','-Pn']),'-n','--disable-arp-ping','--max-retries','1','--max-rate',String(p.rate),'--host-timeout',`${Math.min(p.timeout,60)}s`,'--stats-every','2s',...(p.serviceDetection?['-sV','--version-light']:[]),...(mode==='discovery'?[]:['-p',p.ports.join(',')]),'-oX','-',...p.targets];
}
