const enc=new TextEncoder();
async function verify(req){
 const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('admin_session='))?.slice(14);
 const [payload,sig]=raw?.split('.')||[];if(!payload||!sig||!process.env.ADMIN_SESSION_SECRET)return null;
 const key=await crypto.subtle.importKey('raw',enc.encode(process.env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,Buffer.from(sig,'base64url'),enc.encode(payload)))return null;
 const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.exp>Date.now()?data.token:null;
}
export default async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=await verify(req);if(!token)return new Response('Please log in',{status:401});
 const body=await req.json().catch(()=>null),item=body?.item;
 if(!item||typeof item.title!=='string'||item.title.length>180||!['أعراس','حنّات','خطوبة','دبكات','مناسبات','ستوريات'].includes(item.category))return new Response('Invalid item',{status:400});
 let video;try{video=new URL(item.url)}catch{return new Response('Invalid URL',{status:400})}
 if(video.protocol!=='https:'||!['youtube.com','www.youtube.com','youtu.be','m.youtube.com','facebook.com','www.facebook.com','m.facebook.com','fb.watch','www.fb.watch'].includes(video.hostname))return new Response('Invalid video host',{status:400});
 if(item.thumbnail){let thumb;try{thumb=new URL(item.thumbnail)}catch{return new Response('Invalid thumbnail',{status:400})}if(thumb.protocol!=='https:')return new Response('Invalid thumbnail',{status:400})}
 const api='https://api.github.com/repos/ymvlog1-boop/Yasser-Al-Tai-Portfolio/contents/videos.json';
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'Yasser-Portfolio'};
 const old=await fetch(api,{headers,cache:'no-store'});if(!old.ok)return new Response('Cannot read videos',{status:502});
 const file=await old.json();const existing=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
 if(!Array.isArray(existing))return new Response('Invalid existing data',{status:500});
 const clean={title:item.title.trim(),category:item.category,url:video.href,description:String(item.description||'').slice(0,500),...(item.thumbnail?{thumbnail:item.thumbnail}:{})};
 const content=Buffer.from(JSON.stringify([clean,...existing],null,2)+'\n').toString('base64');
 const write=await fetch(api,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Publish video: '+clean.title,content,sha:file.sha,branch:'main'})});
 if(!write.ok)return new Response('Publish failed: '+write.status,{status:write.status===409?409:502});
 return Response.json({ok:true});
};
