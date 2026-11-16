const cookie=(h,n)=>h?.split(';').map(s=>s.trim()).find(s=>s.startsWith(n+'='))?.slice(n.length+1);
export default async req=>{
 const u=new URL(req.url), state=u.searchParams.get('state'), code=u.searchParams.get('code');
 if(!state||!code||state!==cookie(req.headers.get('cookie'),'oauth_state')) return new Response('Invalid login state',{status:403});
 const id=process.env.GITHUB_OAUTH_CLIENT_ID,secret=process.env.GITHUB_OAUTH_CLIENT_SECRET,signing=process.env.ADMIN_SESSION_SECRET;
 if(!id||!secret||!signing) return new Response('Login not configured',{status:503});
 const exchange=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:id,client_secret:secret,code})});
 const data=await exchange.json();if(!data.access_token)return new Response('GitHub authorization failed',{status:401});
 const me=await fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+data.access_token,'User-Agent':'Yasser-Portfolio'}});
 const user=await me.json();if(user.login!=='ymvlog1-boop')return new Response('Not authorized',{status:403});
 const encoder=new TextEncoder(), payload=Buffer.from(JSON.stringify({token:data.access_token,exp:Date.now()+3600000})).toString('base64url');
 const key=await crypto.subtle.importKey('raw',encoder.encode(signing),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))).toString('base64url');
 return new Response(null,{status:302,headers:{Location:'/admin.html','Set-Cookie':'admin_session='+payload+'.'+signature+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600','Cache-Control':'no-store'}});
};
