#!/usr/bin/env python3
"""Bounded archive reader. Production runs this only inside bubblewrap isolation."""
import base64, bz2, io, lzma, gzip, hashlib, json, os, pathlib, resource, stat, sys, tarfile, zipfile

MAX_FILES=500
MAX_FILE=4*1024*1024
MAX_TOTAL=16*1024*1024
resource.setrlimit(resource.RLIMIT_CPU,(10,10))
resource.setrlimit(resource.RLIMIT_AS,(256*1024*1024,256*1024*1024))
resource.setrlimit(resource.RLIMIT_FSIZE,(32*1024*1024,32*1024*1024))
resource.setrlimit(resource.RLIMIT_NOFILE,(32,32))
source=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2])
manifest={"format":"probe-extraction-v1","tool":"Python bounded ZIP/TAR/CPIO/gzip/bzip2/xz reader "+sys.version.split()[0],"sourceHash":hashlib.sha256(source.read_bytes()).hexdigest(),"files":[],"errors":[],"complete":False,"limits":{"files":MAX_FILES,"fileBytes":MAX_FILE,"totalBytes":MAX_TOTAL}}
seen=set();total=0
def publish():
    temp=out/'manifest.tmp'
    temp.write_text(json.dumps(manifest))
    os.replace(temp,out/'manifest.json')
def safe_name(name):
    if not isinstance(name,str) or not name or len(name)>512 or '\\' in name or ':' in name or any(ord(c)<32 for c in name): raise ValueError('Unsafe archive path')
    p=pathlib.PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or not p.parts: raise ValueError('Unsafe archive path')
    normalized=str(p)
    if normalized in seen: raise ValueError('Duplicate normalized archive path')
    seen.add(normalized)
    return normalized
def add(name,reader,declared=None,metadata=None):
    global total
    name=safe_name(name)
    if len(manifest['files'])>=MAX_FILES: raise RuntimeError('File-count limit reached')
    if declared is not None and (declared>MAX_FILE or declared<0 or total+declared>MAX_TOTAL): raise ValueError('Declared file exceeds extraction budget')
    chunks=[];size=0;digest=hashlib.sha256()
    while True:
        chunk=reader.read(min(65536,MAX_FILE-size+1))
        if not chunk: break
        size+=len(chunk)
        if size>MAX_FILE or total+size>MAX_TOTAL: raise ValueError('Expanded bytes exceed extraction budget')
        digest.update(chunk);chunks.append(chunk)
    if declared is not None and size!=declared: raise ValueError('Truncated archive member')
    blob=f"file-{len(manifest['files']):04d}.bin"
    with open(out/blob,'xb') as f:
        for chunk in chunks: f.write(chunk)
    os.chmod(out/blob,0o600)
    total+=size;manifest['files'].append({"path":name,"blob":blob,"size":size,"sha256":digest.hexdigest(),**({"metadata":metadata} if metadata else {})});publish()
def problem(name,error):
    manifest['errors'].append({"path":str(name)[:512],"error":str(error)[:300]});publish()
publish()
try:
    with open(source,'rb') as f: head=f.read(512)
    if head.startswith((b'070701',b'070702')):
        sys.path.insert(0,str(pathlib.Path(__file__).parent))
        from cpio_reader import extract
        extract(source,add,problem)
    elif head.startswith(b'BZh'):
        with bz2.open(source,'rb') as member: add('payload.bin',member)
    elif head.startswith(b'\xfd7zXZ\x00'):
        decoder=lzma.LZMADecompressor(format=lzma.FORMAT_XZ,memlimit=64*1024*1024)
        expanded=decoder.decompress(source.read_bytes(),max_length=MAX_FILE+1)
        if len(expanded)>MAX_FILE: raise ValueError('Expanded bytes exceed extraction budget')
        if not decoder.eof or decoder.unused_data: raise ValueError('Truncated or concatenated xz stream is unsupported')
        add('payload.bin',io.BytesIO(expanded))
    elif head.startswith(b'hsqs') or head.startswith(b'sqsh'):
        sys.path.insert(0,str(pathlib.Path(__file__).parent))
        from squashfs_reader import extract
        manifest['tool']='unsquashfs pseudo-stream adapter; installed version recorded in companion capability'
        extract(source,add,problem)
    elif head.startswith(b'PK\x03\x04') or head.startswith(b'PK\x05\x06'):
        with zipfile.ZipFile(source) as z:
            entries=z.infolist()
            if len(entries)>MAX_FILES: raise ValueError('Archive contains more than 500 entries')
            for info in entries:
                if info.is_dir(): continue
                try:
                    mode=(info.external_attr>>16)&0xffff
                    if stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG): raise ValueError('Links and special files are excluded')
                    if info.flag_bits&1: raise ValueError('Encrypted entries are unsupported')
                    with z.open(info) as member: add(info.filename,member,info.file_size,{"mode":mode&0o7777})
                except Exception as e: problem(info.filename,e)
    else:
        is_tar=head[257:262]==b'ustar'
        if head.startswith(b'\x1f\x8b'):
            with gzip.open(source,'rb') as g: is_tar=g.read(512)[257:262]==b'ustar'
        if is_tar:
            with tarfile.open(source,'r|*') as archive:
                count=0
                for info in archive:
                    count+=1
                    if count>MAX_FILES: raise ValueError('Archive contains more than 500 entries')
                    if info.isdir(): continue
                    try:
                        if not info.isfile() or info.issparse(): raise ValueError('Links, sparse and special files are excluded')
                        with archive.extractfile(info) as member: add(info.name,member,info.size,{"mode":info.mode&0o7777,"uid":info.uid,"gid":info.gid,"mtime":info.mtime})
                    except Exception as e: problem(info.name,e)
        elif head.startswith(b'\x1f\x8b'):
            with gzip.open(source,'rb') as member: add('payload.bin',member)
        else: raise ValueError('Unsupported container. This adapter handles ZIP, TAR, CPIO newc/crc, gzip, bzip2, xz and supported SquashFS pseudo streams; signatures alone do not establish extractability.')
    manifest['complete']=not manifest['errors']
except Exception as e: problem('(archive)',e)
publish()
