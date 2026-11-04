"""Bounded SquashFS pseudo-stream adapter; never materializes archive paths.
Production caller must run inside the same mandatory bubblewrap sandbox.
"""
import io, re, subprocess
MARKER=b'#\n# START OF DATA - DO NOT MODIFY\n#\n'
CAP=17*1024*1024

def read_pseudo(payload, add, problem):
    if len(payload)>CAP: raise ValueError('SquashFS pseudo stream exceeds 17 MiB')
    pos=payload.find(MARKER)
    if pos<0 or pos>1024*1024: raise ValueError('Unsupported SquashFS pseudo header')
    header=payload[:pos].decode('utf-8',errors='strict');data=payload[pos+len(MARKER):]
    lines=header.splitlines()
    if len(lines)>501: raise ValueError('SquashFS exceeds 500 entries plus root')
    for line in lines:
        if not line: continue
        parts=line.split()
        name=parts[0] if parts else '(entry)'
        try:
            if len(parts)<2: raise ValueError('Malformed pseudo entry')
            kind=parts[1]
            if name=='/' and kind=='D': continue
            if not re.fullmatch(r'[A-Za-z0-9_.+/-]+',name) or name.startswith('/') or '..' in name.split('/'):
                raise ValueError('Unsupported or unsafe SquashFS filename; escaped names are not guessed')
            if kind=='D': continue
            if kind!='R': raise ValueError('Links and special files are excluded')
            if len(parts)!=9 or not all(re.fullmatch(r'[0-9]+',v) for v in parts[2:]): raise ValueError('Unsupported pseudo metadata')
            length,offset,sparse=map(int,parts[6:9])
            if sparse: raise ValueError('Sparse entries are excluded')
            if offset+length>len(data): raise ValueError('Truncated SquashFS pseudo payload')
            add(name,io.BytesIO(data[offset:offset+length]),length)
        except Exception as e: problem(name,e)

def extract(source,add,problem):
    # -pf outputs inert metadata/data, not commands and not a directory tree.
    # A byte ceiling and inherited CPU/memory limits apply before parsing.
    args=['unsquashfs','-quiet','-no-progress','-processors','1','-mem','32M','-pf','-',str(source)]
    child=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    try:
        payload=child.stdout.read(CAP+1)
        if len(payload)>CAP: raise ValueError('SquashFS expanded stream exceeds 17 MiB')
        if child.wait(timeout=5)!=0: raise ValueError('unsquashfs failed or its pseudo output is unsupported')
        read_pseudo(payload,add,problem)
    finally:
        if child.poll() is None: child.kill()
        child.wait();child.stdout.close()
