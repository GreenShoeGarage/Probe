export const isCompanion=()=>location.hostname==='127.0.0.1';
export async function companionAPI(path,method='GET',value){
 if(!isCompanion())throw Error('Open the local companion URL to use native tools. Portable evidence imports work here.');
 let token='';try{token=sessionStorage.getItem('probe-companion-token')||''}catch{}
 const response=await fetch('/api/'+path,{method,cache:'no-store',signal:AbortSignal.timeout(60000),headers:{'X-Probe-Client':'1',Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});
 let data;try{data=await response.json()}catch{throw Error('This address is not serving the companion API.');}if(!response.ok){if(response.status===401){try{sessionStorage.removeItem('probe-companion-token')}catch{}}throw Error(data.error||'Companion request failed.');}return data;
}
export const decode64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function encode64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
