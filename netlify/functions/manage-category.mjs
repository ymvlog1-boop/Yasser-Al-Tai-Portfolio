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
 const body=await req.json().catch(()=>null),action=body?.action,name=String(body?.name||'').trim();
 if(!['add','delete'].includes(action)||!name||name.length>40)return new Response('Invalid request',{status:400});
 const base='https://api.github.com/repos/ymvlog1-boop/Yasser-Al-Tai-Portfolio/contents/';
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'Yasser-Portfolio'};
 const get=async path=>{const r=await fetch(base+path,{headers,cache:'no-store'});if(!r.ok)throw Error('Cannot read '+path);const f=await r.json();return {sha:f.sha,data:JSON.parse(Buffer.from(f.content.replace(/\s/g,''),'base64').toString('utf8'))}};
 const put=async(path,sha,data,message)=>{const r=await fetch(base+path,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message,content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64'),sha,branch:'main'})});if(!r.ok)throw Error('Save failed: '+r.status)};
 try{
 const cats=await get('categories.json');if(!Array.isArray(cats.data))throw Error('Invalid categories');
 if(action==='add'){if(cats.data.includes(name))return new Response('Category already exists',{status:409});await put('categories.json',cats.sha,[...cats.data,name],'Add category: '+name);return Response.json({ok:true})}
 if(!cats.data.includes(name))return new Response('Category not found',{status:404});
 if(cats.data.length===1)return new Response('Cannot delete last category',{status:409});
 const videos=await get('videos.json');const count=videos.data.filter(v=>v.category===name).length;
 if(count)return new Response('Category contains '+count+' videos. Move or delete them first.',{status:409});
 await put('categories.json',cats.sha,cats.data.filter(x=>x!==name),'Remove empty category: '+name);return Response.json({ok:true});
 }catch(e){return new Response(e.message,{status:502})}
};