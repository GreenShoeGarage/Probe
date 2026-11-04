// Test process only. This is NOT Nmap. No packaging or CLI path selects it.
import net from 'node:net';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const args=process.argv.slice(2);
if(args.includes('--version')){console.log('Nmap version TEST-ADAPTER (simulated; not Nmap)');process.exit(0);}
const mode=args.includes('--fixture-mode')?args[args.indexOf('--fixture-mode')+1]:'connect';
if(mode==='hang'){
  process.on('SIGTERM',()=>{});
  const child=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{stdio:'ignore'});
  console.error('TEST_CHILD_PID='+child.pid);process.stdout.write('<nmaprun>');setInterval(()=>{},1000);
}else if(mode==='flood'){process.stdout.write(Buffer.alloc(5*1024*1024,65));}
else if(mode==='fail'){console.error('intentional fixture failure');process.exitCode=2;}
else if(args.includes('-sn')||args.includes('-sU')){const host=args.at(-1),discovery=args.includes('-sn'),ports=discovery?[]:args[args.indexOf('-p')+1].split(',');console.log(`<?xml version="1.0"?><nmaprun scanner="nmap" version="TEST-ADAPTER">${discovery?'':`<scaninfo type="udp" protocol="udp" services="${ports.join(',')}"/>`}<host><status state="up" reason="fixture"/><address addr="${host}" addrtype="ipv4"/>${discovery?'':`<ports>${ports.map(port=>`<port protocol="udp" portid="${port}"><state state="open|filtered" reason="no-response"/></port>`).join('')}</ports>`}</host><runstats><finished exit="success"/></runstats></nmaprun>`);}
else {
  const ports=args[args.indexOf('-p')+1].split(',').map(Number),host=args.at(-1);
  const rows=[];
  for(const port of ports){const state=await new Promise(resolve=>{const socket=net.createConnection({host,port});socket.once('connect',()=>{socket.destroy();resolve('open')});socket.once('error',()=>resolve('closed'));socket.setTimeout(500,()=>{socket.destroy();resolve('filtered')});});rows.push(`<port protocol="tcp" portid="${port}"><state state="${state}"/><service name="fixture" method="table" conf="3"/></port>`);}
  console.error('Connect Scan Timing: About 50.00% done');
  console.log(`<?xml version="1.0"?><!DOCTYPE nmaprun><nmaprun scanner="nmap" version="TEST-ADAPTER"><scaninfo type="connect" protocol="tcp" services="${ports.join(',')}"/><host><status state="up"/><address addr="${host}" addrtype="ipv4"/><ports>${rows.join('')}</ports></host><runstats><finished exit="success"/></runstats></nmaprun>`);
}
