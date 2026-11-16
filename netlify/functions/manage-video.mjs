const enc=new TextEncoder();
async function verify(req){
 const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('admin_session='))?.slice(14);
 const [payload,sig]=raw?.split('.')||[];if(!payload||!sig||!process.env.ADMIN_SESSION_SECRET)return null;
 try{
 const key=await crypto.subtle.importKey('raw',enc.encode(process.env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Buffer.from(sig,'base64url'),enc.encode(payload)))return null;
 const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.exp>Date.now()?data.token:null;
 }catch{return null}
}
export default async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=await verify(req);if(!token)return new Response('Please log in',{status:401});
 const body=await req.json().catch(()=>null);
 const target=body?.target;const action=body?.action;const category=body?.category;if(!['move','delete'].includes(action))return new Response('Invalid action',{status:400});
 if(!target||typeof target.url!=='string'||typeof target.title!=='string'||typeof target.category!=='string')return new Response('Invalid video',{status:400});
 const base='https://api.github.com/repos/ymvlog1-boop/Yasser-Al-Tai-Portfolio/contents/';const api=base+'videos.json';
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'Yasser-Portfolio'};
 if(action==='move'){const cats=await fetch(base+'categories.json',{headers,cache:'no-store'});if(!cats.ok)return new Response('Cannot read categories',{status:502});const catFile=await cats.json();const allowed=JSON.parse(Buffer.from(catFile.content.replace(/\s/g,''),'base64').toString('utf8'));if(!allowed.includes(category))return new Response('Invalid category',{status:400})}const old=await fetch(api,{headers,cache:'no-store'});if(!old.ok)return new Response('Cannot read videos',{status:502});
 const file=await old.json();const existing=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
 if(!Array.isArray(existing))return new Response('Invalid existing data',{status:500});
 const matches=existing.filter(v=>v.url===target.url&&v.title===target.title&&v.category===target.category);
 if(matches.length!==1)return new Response('Video not found or ambiguous; refresh the page',{status:409});
 const index=existing.findIndex(v=>v.url===target.url&&v.title===target.title&&v.category===target.category);
 const updated=action==='delete'?existing.filter((_,i)=>i!==index):existing.map((v,i)=>i===index?{...v,category}:v);
 const content=Buffer.from(JSON.stringify(updated,null,2)+'\n').toString('base64');
 const write=await fetch(api,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:(action==='delete'?'Remove video: ':'Move video: ')+target.title.slice(0,100),content,sha:file.sha,branch:'main'})});
 if(!write.ok)return new Response('Delete failed: '+write.status,{status:write.status===409?409:502});
 return Response.json({ok:true});
};