import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,readdir,open,chmod,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {readiness,diagnostics} from './readiness.mjs';
import {createDebugger} from './debugger.mjs';
import {createExtraction} from './extraction.mjs';
import {VERSION} from '../dist/core.js';
import {LIMITS,allowedRanges,normalizeProfile,nmapArgs} from './policy.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const iso=()=>new Date().toISOString();
const terminal=s=>!['running','stopping'].includes(s);
const same=(a,b)=>typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const STATIC=['index.html','style.css','app.js','core.js','components.js','advisories.js','advisory-ui.js','serial.js','network.js','ip.js','scan-ui.js','debug-ui.js','firmware.js','firmware-compare.js','firmware-compare-ui.js','firmware-ui.js','firmware-worker.js','companion-client.js','companion-ui.js','qualification.js','investigation.js','investigation-ui.js','qualification-ui.js','sample.js','icon.svg','manifest.webmanifest','sw.js'];
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
async function atomic(file,value){const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2),{mode:0o600});await rename(tmp,file);}
async function body(req,max=16384){let chunks=[],n=0;for await(const b of req){n+=b.length;if(n>max)throw Error('Request exceeds this operation’s size limit.');chunks.push(b);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}

export async function createCompanion(options={}) {
  const dataDir=options.dataDir||path.join(os.homedir(),'.probe','scans');
  await mkdir(dataDir,{recursive:true,mode:0o700});
  const lockPath=path.join(dataDir,'.companion-lock');let lock;
  try{lock=await open(lockPath,'wx',0o600)}catch(e){if(e.code==='EEXIST')throw Error('Evidence directory is locked by another or interrupted companion. Stop its process first; after an abnormal exit, remove only .companion-lock from that directory and restart to recover originals.');throw e;}
  const release=async()=>{await lock.close();await unlink(lockPath)};
  try{await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:iso()}));const app=await createUnlocked({...options,dataDir});const close=app.close;let released=false;app.close=async()=>{if(released)return;released=true;try{await close()}finally{await release()}};return app;}catch(e){await release();throw e;}
}
async function createUnlocked({port=8844,allow='127.0.0.1',dataDir,staticDir=fileURLToPath(new URL('../dist',import.meta.url)),tool=['nmap'],spawnProcess=spawn,debugProfiles=[],debugTools={},udpEnabled=false}={}) {
  if(!['linux','darwin'].includes(process.platform))throw Error('This candidate supports Linux/macOS process control only. Windows is not implemented.');
  const allowed=allowedRanges(allow),pairCode=randomBytes(24).toString('hex');let token='',tokenUntil=0,attempts=0,attemptWindow=0,origin='',active=null,starting=false,closed=false;
  const jobs=new Map(),children=new Map();await mkdir(dataDir,{recursive:true,mode:0o700});await chmod(dataDir,0o700);
  async function persist(job){await atomic(path.join(dataDir,job.id,'job.json'),job);}
  async function envelope(job){const dir=path.join(dataDir,job.id);const [xml,stderr]=await Promise.all([readFile(path.join(dir,'output.xml')),readFile(path.join(dir,'stderr.log'))]);return {format:'probe-native-scan-v1',job,xmlBase64:xml.toString('base64'),stderrBase64:stderr.toString('base64')};}
  // Recover originals after an unexpected stop. A new process never replays a scan.
  for(const name of await readdir(dataDir)){
    if(!/^[a-f0-9-]{36}$/.test(name))continue;
    try{const job=JSON.parse(await readFile(path.join(dataDir,name,'job.json'),'utf8'));
      if(job.id!==name)continue;
      if(!terminal(job.status)){const e=await envelope(job);const xml=Buffer.from(e.xmlBase64,'base64'),err=Buffer.from(e.stderrBase64,'base64');Object.assign(job,{status:'interrupted',endedAt:iso(),error:'Companion stopped before completion; originals recovered. No scan replayed.',xmlBytes:xml.length,stderrBytes:err.length,xmlHash:hash(xml),stderrHash:hash(err)});await persist(job);}
      jobs.set(job.id,job);
    }catch(e){throw Error(`Cannot recover scan ${name}: ${e.message}. Preserve the data directory and resolve the storage error before restarting.`);}
  }
  const toolInfo=await new Promise(resolve=>{
    let output='',finished=false;const done=x=>{if(finished)return;finished=true;clearTimeout(timer);resolve(x)};
    const child=spawnProcess(tool[0],[...tool.slice(1),'--version'],{shell:false,stdio:['ignore','pipe','pipe'],env:{...process.env,LANG:'C',LC_ALL:'C'}});
    const timer=setTimeout(()=>{child.kill('SIGKILL');done({available:false,error:'Nmap version check timed out.'})},3000);
    child.stdout.on('data',b=>{output=(output+b.toString()).slice(0,4096)});child.stderr.on('data',()=>{});
    child.once('error',e=>done({available:false,error:`Nmap unavailable: ${e.code||e.message}. Install Nmap and restart the companion.`}));
    child.once('close',code=>done(code===0&&/Nmap version /i.test(output)?{available:true,version:output.trim()}:{available:false,error:'Executable did not report a valid Nmap version.'}));
  });
  function stop(job,reason='cancelled'){
    const state=children.get(job.id);if(!state||state.reason)return;state.reason=reason;job.status='stopping';job.stopReason=reason;
    const kill=signal=>{try{process.kill(-state.child.pid,signal)}catch(e){if(e.code!=='ESRCH')job.error='Could not signal scan process: '+e.message;}};
    kill('SIGTERM');state.killTimer=setTimeout(()=>kill('SIGKILL'),1500);state.killTimer.unref();
  }
  async function launch(profile){
    if(closed)throw Error('Companion is shutting down.');if(active||starting)throw Error('One scan can run at a time. Finish or cancel the active scan.');
    if(!toolInfo.available)throw Error(toolInfo.error);if(jobs.size>=LIMITS.jobs)throw Error('The companion retains at most 20 scans. Export them, stop the companion, and archive its data directory before starting a new collection.');
    starting=true;
    let job,xmlFile,errFile;
    try{
      job={id:randomUUID(),projectId:profile.projectId,deviceId:profile.deviceId,label:profile.label,profile,args:nmapArgs(profile),allowedScope:allowed.map(r=>r.text),tool:toolInfo.version,platform:`${os.platform()} ${os.release()} ${os.arch()}`,node:process.version,startedAt:iso(),endedAt:null,status:'running',xmlBytes:0,stderrBytes:0,progress:'Starting Nmap…',error:'',exitCode:null,signal:null};
      const dir=path.join(dataDir,job.id);await mkdir(dir,{mode:0o700});
      xmlFile=await open(path.join(dir,'output.xml'),'wx',0o600);errFile=await open(path.join(dir,'stderr.log'),'wx',0o600);await persist(job);
      if(closed)throw Error('Companion stopped before the scan could launch.');
      jobs.set(job.id,job);active=job;
      const child=spawnProcess(tool[0],[...tool.slice(1),...job.args],{shell:false,detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,LANG:'C',LC_ALL:'C'}});
      const state={child,reason:null,killTimer:null,done:null};children.set(job.id,state);
      let writing=Promise.resolve(),xmlDigest=createHash('sha256'),errDigest=createHash('sha256');
      const consume=(b,type)=>{
        const key=type==='xml'?'xmlBytes':'stderrBytes',limit=type==='xml'?LIMITS.xml:LIMITS.stderr,file=type==='xml'?xmlFile:errFile,digest=type==='xml'?xmlDigest:errDigest;
        const accepted=b.subarray(0,Math.max(0,limit-job[key]));job[key]+=accepted.length;digest.update(accepted);
        writing=writing.then(async()=>{let offset=0;while(offset<accepted.length){const result=await file.write(accepted,offset,accepted.length-offset);if(!result.bytesWritten)throw Error('Zero-byte evidence write.');offset+=result.bytesWritten;}}).catch(e=>{job.error='Evidence storage failed: '+e.message;stop(job,'storage-error')});
        if(type==='stderr'){const m=b.toString().match(/(?:About\s+)?([\d.]+)% done/);if(m)job.progress=`Nmap reports ${m[1]}% for its current phase (not overall completion).`;}
        if(accepted.length<b.length)stop(job,'output-limit');
      };
      child.stdout.on('data',b=>consume(b,'xml'));child.stderr.on('data',b=>consume(b,'stderr'));
      child.once('error',e=>{job.error=`Nmap launch failed: ${e.code||e.message}`;state.reason='failed';});
      const timeout=setTimeout(()=>stop(job,'timed-out'),profile.timeout*1000);
      state.done=new Promise(resolve=>child.once('close',async(code,signal)=>{
        clearTimeout(timeout);clearTimeout(state.killTimer);
        // Also terminate any still-owned descendants before releasing the job.
        try{process.kill(-child.pid,'SIGKILL')}catch{}
        await writing;try{await xmlFile.sync();await errFile.sync();await xmlFile.close();await errFile.close();}catch(e){job.error='Evidence flush failed: '+e.message;state.reason='storage-error';}
        Object.assign(job,{status:state.reason||(code===0?'completed':'failed'),endedAt:iso(),exitCode:code,signal,xmlHash:xmlDigest.digest('hex'),stderrHash:errDigest.digest('hex'),progress:''});
        if(code!==0&&!job.error&&!state.reason)job.error=`Nmap exited with code ${code}. See preserved stderr.`;
        try{await persist(job)}catch(e){job.status='storage-error';job.error='Final record could not be saved: '+e.message;}
        active=null;children.delete(job.id);resolve();
      }));
      return job;
    }catch(e){if(xmlFile)await xmlFile.close().catch(()=>{});if(errFile)await errFile.close().catch(()=>{});active=null;throw e;}
    finally{starting=false;}
  }
  const debuggerManager=await createDebugger({dataDir,profiles:debugProfiles,...debugTools});
  const extractionManager=await createExtraction({dataDir});
  function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(value));}
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.headers.host!==new URL(origin).host)return json(res,403,{error:'Host is not the local companion.'});
      const url=new URL(req.url,origin);
      if(url.pathname.startsWith('/api/')){
        if(req.headers['x-probe-client']!=='1'||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Only the local PROBE origin can use this API.'});
        if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
        if(req.method==='POST'&&req.headers['content-type']!=='application/json')return json(res,415,{error:'Use application/json.'});
        if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{app:'PROBE companion',version:VERSION});
        if(req.method==='POST'&&url.pathname==='/api/pair'){
          if(Date.now()-attemptWindow>60000){attempts=0;attemptWindow=Date.now();}if(++attempts>8)return json(res,429,{error:'Too many pairing attempts. Wait one minute.'});
          const input=await body(req);if(!same(input.code,pairCode))return json(res,403,{error:'Pairing code does not match this companion.'});
          token=randomBytes(32).toString('hex');tokenUntil=Date.now()+8*60*60*1000;return json(res,200,{token,expiresAt:tokenUntil});
        }
        if(Date.now()>tokenUntil||!token||!same(req.headers.authorization,`Bearer ${token}`))return json(res,401,{error:'Pair this browser using the code printed by the companion.'});
        if(req.method==='GET'&&['/api/readiness','/api/diagnostics'].includes(url.pathname)){const h=readiness({version:VERSION,nmap:toolInfo,debug:debuggerManager.status(),extraction:extractionManager.status(),scans:[...jobs.values()]});return json(res,200,url.pathname==='/api/diagnostics'?diagnostics(h):h);}
        if(req.method==='GET'&&url.pathname==='/api/debug/status')return json(res,200,debuggerManager.status());
        if(req.method==='POST'&&url.pathname==='/api/debug/attach')return json(res,201,{session:await debuggerManager.attach(await body(req))});
        const debugMatch=/^\/api\/debug\/sessions\/([a-f0-9-]{36})(\/operate)?$/.exec(url.pathname);
        if(debugMatch){if(req.method==='GET'&&!debugMatch[2])return json(res,200,await debuggerManager.exported(debugMatch[1]));if(req.method==='POST'&&debugMatch[2])return json(res,200,await debuggerManager.operation(debugMatch[1],await body(req,12*1024*1024)));}
        if(req.method==='GET'&&url.pathname==='/api/extract/status')return json(res,200,extractionManager.status());
        if(req.method==='POST'&&url.pathname==='/api/extract/jobs')return json(res,201,{job:await extractionManager.start(await body(req,48*1024*1024))});
        const extractMatch=/^\/api\/extract\/jobs\/([a-f0-9-]{36})(\/cancel)?$/.exec(url.pathname);
        if(extractMatch){if(req.method==='GET'&&!extractMatch[2])return json(res,200,await extractionManager.result(extractMatch[1]));if(req.method==='POST'&&extractMatch[2]){extractionManager.cancel(extractMatch[1]);return json(res,200,{stopping:true});}}
        if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,{app:'PROBE companion',version:VERSION,tool:toolInfo,features:{udp:udpEnabled,discovery:true,scopedIPv6:true},allowedScope:allowed.map(r=>r.text),limits:LIMITS,jobs:[...jobs.values()].reverse()});
        if(req.method==='POST'&&['/api/preview','/api/jobs'].includes(url.pathname)){
          const profile=normalizeProfile(await body(req),allowed,{udp:udpEnabled});
          if(url.pathname==='/api/preview')return json(res,200,{profile,args:nmapArgs(profile),tool:toolInfo});
          return json(res,201,{job:await launch(profile)});
        }
        const match=/^\/api\/jobs\/([a-f0-9-]{36})(\/cancel)?$/.exec(url.pathname);
        if(match){const job=jobs.get(match[1]);if(!job)return json(res,404,{error:'Scan not found.'});
          if(req.method==='POST'&&match[2]){stop(job);return json(res,200,{job});}
          if(req.method==='GET'&&!match[2])return json(res,200,terminal(job.status)?await envelope(job):{job});
        }
        return json(res,404,{error:'Unknown companion operation.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
      const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(!STATIC.includes(file))return json(res,404,{error:'File not found.'});
      const bytes=await readFile(path.join(staticDir,file));res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:bytes);
    }catch(e){json(res,400,{error:e.message});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});origin=`http://127.0.0.1:${server.address().port}`;
  return {server,origin,pairCode,toolInfo,dataDir,async close(){closed=true;await debuggerManager.close();await extractionManager.close();const waits=[...children.entries()].map(([id,s])=>{stop(jobs.get(id),'interrupted');return s.done});await Promise.all(waits);await new Promise(resolve=>server.close(resolve));}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i+=2){if(!['--port','--allow','--data-dir','--nmap','--debug-profiles','--openocd','--gdb','--udp'].includes(args[i])||!args[i+1])throw Error('Usage: node companion/server.mjs [--allow IPv4,CIDR,exact-IPv6%interface] [--udp enabled|disabled] [--port 8844] [--data-dir PATH] [--nmap /absolute/path] [--debug-profiles PATH] [--openocd PATH] [--gdb PATH]');opts[args[i]]=args[i+1];}
    if(opts['--udp']&&!['enabled','disabled'].includes(opts['--udp']))throw Error('--udp must be enabled or disabled.');
    const port=Number(opts['--port']||8844);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port must be 1024–65535.');
    if(opts['--nmap']&&!path.isAbsolute(opts['--nmap']))throw Error('--nmap requires an absolute path.');
    for(const key of ['--openocd','--gdb'])if(opts[key]&&!path.isAbsolute(opts[key]))throw Error(key+' requires an absolute path.');
    const debugProfiles=opts['--debug-profiles']?JSON.parse(await readFile(path.resolve(opts['--debug-profiles']),'utf8')):[];
    const app=await createCompanion({port,udpEnabled:opts['--udp']==='enabled',debugProfiles,debugTools:{...(opts['--openocd']?{openocd:[opts['--openocd']]}:{}),...(opts['--gdb']?{gdb:[opts['--gdb']]}:{})},allow:opts['--allow']||'127.0.0.1',...(opts['--data-dir']?{dataDir:path.resolve(opts['--data-dir'])}:{}),...(opts['--nmap']?{tool:[opts['--nmap']]}:{})});
    console.log(`PROBE ${VERSION}\nOpen ${app.origin}\nPairing code: ${app.pairCode}\nEvidence directory: ${app.dataDir}\n${app.toolInfo.available?app.toolInfo.version:app.toolInfo.error}\nOne paired browser session; restart to invalidate its code and token. Ctrl+C stops owned acquisitions; target execution state after debugger shutdown is unknown.`);
    let closing=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await app.close();process.exit(0)});
  }catch(e){console.error(e.message);process.exitCode=1;}
}
