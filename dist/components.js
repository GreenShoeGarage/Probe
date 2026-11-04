// Conservative identities: qualifiers and namespaces remain significant.
export function purlIdentity(value){
 if(typeof value!=='string'||value.length>2048||!/^pkg:[a-z][a-z0-9.+-]*\//i.test(value)||/[\s\x00-\x1f]/.test(value))throw Error('Invalid package URL.');
 const decode=s=>{const x=decodeURIComponent(s);if(!x||/[\x00-\x1f]/.test(x))throw Error('Invalid package URL segment.');return encodeURIComponent(x);};
 let body=value.slice(4),sub='';const hash=body.indexOf('#');if(hash>=0){sub=body.slice(hash+1).split('/').map(x=>{if(x==='.'||x==='..')throw Error('Invalid package subpath.');return decode(x);}).join('/');body=body.slice(0,hash);}
 let qualifiers='';const q=body.indexOf('?');if(q>=0){const seen=new Set();qualifiers=body.slice(q+1).split('&').map(pair=>{const i=pair.indexOf('=');if(i<1)throw Error('Invalid package qualifier.');const key=pair.slice(0,i).toLowerCase();if(!/^[a-z][a-z0-9._-]*$/.test(key)||seen.has(key))throw Error('Invalid or duplicate package qualifier.');seen.add(key);return key+'='+decode(pair.slice(i+1));}).sort().join('&');body=body.slice(0,q);}
 const slash=body.indexOf('/'),type=body.slice(0,slash).toLowerCase();let path=body.slice(slash+1),version='';const at=path.lastIndexOf('@');if(at>=0){version=decodeURIComponent(path.slice(at+1));if(!version)throw Error('Missing package version.');path=path.slice(0,at);}
 path=path.split('/').map(decode).join('/');return {key:'pkg:'+type+'/'+path+(qualifiers?'?'+qualifiers:'')+(sub?'#'+sub:''),type,path:decodeURIComponent(path),version};
}
export function componentIdentity(c){try{if(c.purl)return {...purlIdentity(c.purl),strength:'Package URL'};}catch{}
 return {key:JSON.stringify([c.ecosystem||'',c.supplier||'',c.group||'',c.name||'']),strength:c.purl?'Invalid PURL; declared identity only':'Declared identity; package URL missing'};
}
