// Simulated processes for protocol tests. No target hardware is accessed.
import readline from 'node:readline';
const mode=process.argv[2],fault=process.argv[3],args=process.argv;
if(args.includes('--version')){console.log(mode==='openocd'?'Open On-Chip Debugger fixture':'GNU gdb fixture');process.exit(0);}
if(mode==='openocd'){const p=args.find(x=>x.startsWith('gdb port '))?.split(' ')[2];console.error('Listening on port '+p+' for gdb connections');setInterval(()=>{},1000);}
else {let running=false;readline.createInterface({input:process.stdin}).on('line',line=>{const [,token,cmd]=/^(\d+)(.*)$/.exec(line);const done=data=>console.log(token+'^done'+(data?','+data:''));if(fault==='hang'&&cmd.startsWith('-data-list-register'))return;if(fault==='unplug'&&cmd.startsWith('-data-list-register'))return process.exit(2);
 if(cmd==='-thread-info')done('threads=[{id="1",state="'+(running?'running':'stopped')+'"}]');
 else if(cmd.startsWith('-exec-continue')){running=true;console.log('*running,thread-id="all"');console.log(token+'^running');if(fault==='hardware-hit'){running=false;console.log('*stopped,reason="access-watchpoint-trigger",hw-awpt={number="2",exp="fixture"},frame={addr="0x08000002"}');}}
 else if(cmd.startsWith('-exec-interrupt')||cmd.startsWith('-exec-step')){running=false;done();console.log('*stopped,reason="end-stepping-range",frame={addr="0x08000002"}');}
 else if(cmd==='-data-list-register-names')done('register-names=["r0","pc","sp"]');
 else if(cmd.startsWith('-data-list-register-values'))done('register-values=[{number="0",value="0x1234"},{number="1",value="0x08000002"},{number="2",value="0x20000100"}]');
 else if(cmd.startsWith('-data-read-memory-bytes')){const [,address,length]=cmd.split(' ');done('memory=[{begin="'+address+'",contents="'+Buffer.alloc(Number(length),0x41).toString('hex')+'"}]');}
 else if(cmd.startsWith('-stack-list'))done('stack=[frame={level="0",addr="0x08000002",func="fixture"}]');
 else if(cmd.startsWith('-break-insert'))done('bkpt={number="1",type="'+(fault==='software'?'breakpoint':'hw breakpoint')+'",addr="0x08000002"}');
 else if(cmd.startsWith('-break-watch'))done((cmd.includes('-r ')?'hw-rwpt':cmd.includes('-a ')?'hw-awpt':'wpt')+'={number="2",exp="test"}');
 else if(cmd.startsWith('-break-info'))done('BreakpointTable={body=[bkpt={number="2",type="'+(fault==='software-watch'?'watchpoint':'hw watchpoint')+'"}]}');
 else done();});}
