export default async () => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) return new Response('GitHub login is not configured yet.', {status:503});
  const state = crypto.randomUUID();
  const callback = new URL('/.netlify/functions/oauth-callback', process.env.URL || 'https://statuesque-meerkat-2cb41e.netlify.app').href;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callback);
  url.searchParams.set('scope', 'repo');
  url.searchParams.set('state', state);
  return new Response(null, {status:302, headers:{Location:url.href,'Set-Cookie': 'oauth_state='+state+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600','Cache-Control':'no-store'}});
};
