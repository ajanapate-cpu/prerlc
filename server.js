const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const root = __dirname;
const port = 5500;
const clientId = '1549815037395206164';
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
const redirectUri = 'http://localhost:5500/auth/callback';
const sessions = new Map();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const callbackPage = `<!doctype html><html><head><meta charset="utf-8"><title>PRERLC login</title><style>body{margin:0;background:#050505;color:#fff;font:700 18px Arial;display:grid;place-items:center;height:100vh;text-align:center}p{color:#aaa;font-size:13px}</style></head><body><main><h1>Discord login complete</h1><p>This window will close automatically.</p></main><script>window.opener?.postMessage({type:'prerlc-auth-complete'},'http://localhost:5500');setTimeout(()=>window.close(),500)</script></body></html>`;

function sendJson(response, status, data, extraHeaders = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  response.end(JSON.stringify(data));
}

function getSession(request) {
  const cookie = request.headers.cookie || '';
  const match = cookie.match(/prerlc_session=([^;]+)/);
  return match ? sessions.get(match[1]) : null;
}

async function exchangeCode(code) {
  if (!clientSecret) throw new Error('DISCORD_CLIENT_SECRET is not configured.');
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) throw new Error('Discord token exchange failed.');
  const token = await tokenResponse.json();
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const [userResponse, guildResponse] = await Promise.all([fetch('https://discord.com/api/users/@me', { headers }), fetch('https://discord.com/api/users/@me/guilds', { headers })]);
  if (!userResponse.ok || !guildResponse.ok) throw new Error('Discord profile lookup failed.');
  return { user: await userResponse.json(), guilds: await guildResponse.json() };
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === '/api/me') {
    const session = getSession(request);
    if (!session) return sendJson(response, 401, { authenticated: false });
    return sendJson(response, 200, { authenticated: true, ...session });
  }

  if (requestUrl.pathname === '/auth/callback') {
    if (!requestUrl.searchParams.has('code')) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Missing Discord authorization code.');
      return;
    }
    exchangeCode(requestUrl.searchParams.get('code')).then((session) => {
      const sessionId = crypto.randomBytes(24).toString('hex');
      sessions.set(sessionId, session);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `prerlc_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/` });
      response.end(callbackPage);
    }).catch((error) => {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message);
    });
    return;
  }

  const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => console.log(`PRERLC running at http://localhost:${port}`));
