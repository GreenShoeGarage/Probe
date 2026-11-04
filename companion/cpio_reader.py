"""Strict single newc/crc archive reader; never creates archive-named paths."""
import io, stat

def extract(source, add, problem):
    data=source.read_bytes();pos=0;count=0;trailer=False
    while pos<len(data):
        if len(data)-pos<110 or data[pos:pos+6] not in (b'070701',b'070702'):
            raise ValueError('Truncated or unsupported CPIO header')
        crc=data[pos:pos+6]==b'070702';raw=data[pos+6:pos+110]
        if any(c not in b'0123456789abcdefABCDEF' for c in raw): raise ValueError('Invalid CPIO numeric field')
        fields=[int(raw[i:i+8],16) for i in range(0,104,8)]
        ino,mode,uid,gid,nlink,mtime,size,major,minor,rmajor,rminor,namesize,check=fields
        pos+=110
        if not 1<=namesize<=513 or pos+namesize>len(data): raise ValueError('Invalid CPIO name length')
        namebytes=data[pos:pos+namesize]
        if namebytes[-1:]!=b'\0' or b'\0' in namebytes[:-1]: raise ValueError('Invalid CPIO filename terminator')
        name=namebytes[:-1].decode('utf-8','strict');pos=(pos+namesize+3)&~3
        end=pos+size
        if end>len(data): raise ValueError('Truncated CPIO member')
        if name=='TRAILER!!!':
            if size: raise ValueError('Invalid CPIO trailer')
            trailer=True
            if any(data[end:]): raise ValueError('Concatenated archives and nonzero trailing data require separate inspection')
            break
        count+=1
        if count>500: raise ValueError('Archive contains more than 500 entries')
        try:
            if crc and sum(memoryview(data)[pos:end])&0xffffffff!=check: raise ValueError('CPIO checksum mismatch')
            if not crc and check: raise ValueError('Unexpected newc checksum')
            if stat.S_ISDIR(mode):
                if size: raise ValueError('Directory contains data')
            else:
                if not stat.S_ISREG(mode) or nlink!=1: raise ValueError('Links and special files are excluded')
                if size>4*1024*1024: raise ValueError('Declared file exceeds extraction budget')
                add(name,io.BytesIO(data[pos:end]),size,{'mode':mode&0o7777,'uid':uid,'gid':gid,'mtime':mtime})
        except Exception as e: problem(name,e)
        pos=(end+3)&~3
    if not trailer: raise ValueError('This reader requires an explicit CPIO trailer')
