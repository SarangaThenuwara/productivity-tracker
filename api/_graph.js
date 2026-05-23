require('dotenv').config();
const https = require('https');
const querystring = require('querystring');

// ── App-only token cache ──────────────────────────────────────────────────────
let _appToken = null;
let _appTokenExpiry = 0;

async function getAppToken() {
  if (_appToken && Date.now() < _appTokenExpiry - 60000) return _appToken;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Server misconfiguration: AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must all be set.'
    );
  }

  const body = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const token = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'login.microsoftonline.com',
        path: `/${tenantId}/oauth2/v2.0/token`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) resolve(parsed);
            else reject(new Error(parsed.error_description || JSON.stringify(parsed)));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  _appToken = token.access_token;
  _appTokenExpiry = Date.now() + token.expires_in * 1000;
  console.log('[Graph] App-only token acquired, expires in', token.expires_in, 's');
  return _appToken;
}

// ── Graph API helper ──────────────────────────────────────────────────────────
async function graphFetch(path, method = 'GET', payload = null) {
  const token = await getAppToken();
  const bodyStr = payload ? JSON.stringify(payload) : null;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'graph.microsoft.com',
        path,
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Site Resolver ─────────────────────────────────────────────────────────────
let _siteId = null;

async function getSiteId() {
  if (_siteId) return _siteId;
  const host = process.env.SHAREPOINT_HOST || 'outrightbposervicessdnbhd.sharepoint.com';
  const site = process.env.SHAREPOINT_SITE || 'OutrightProductivity';
  const r = await graphFetch(`/v1.0/sites/${host}:/sites/${site}`);
  if (r.status !== 200) throw new Error('Failed to resolve SharePoint site: ' + JSON.stringify(r.body));
  _siteId = r.body.id;
  console.log('[Graph] Resolved siteId:', _siteId);
  return _siteId;
}

module.exports = {
  getAppToken,
  graphFetch,
  getSiteId
};
