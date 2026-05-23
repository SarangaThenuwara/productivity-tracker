/**
 * api/sharepoint.js
 * Server-side SharePoint proxy — uses app-only token (client_credentials) so
 * individual users do NOT need SharePoint permissions. The app's
 * Sites.FullControl.All application permission handles everything.
 */

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
  console.log('[SharePoint] App-only token acquired, expires in', token.expires_in, 's');
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

// ── Site / List ID resolver ──────────────────────────────────────────────────
let _siteId = null;
let _listId = null;

async function getSiteId() {
  if (_siteId) return _siteId;
  const host = process.env.SHAREPOINT_HOST || 'outrightbposervicessdnbhd.sharepoint.com';
  const site = process.env.SHAREPOINT_SITE || 'OutrightProductivity';
  const r = await graphFetch(`/v1.0/sites/${host}:/sites/${site}`);
  if (r.status !== 200) throw new Error('Failed to resolve SharePoint site: ' + JSON.stringify(r.body));
  _siteId = r.body.id;
  console.log('[SharePoint] Resolved siteId:', _siteId);
  return _siteId;
}

async function getListId() {
  if (_listId) return _listId;
  // Use GUID directly if provided
  if (process.env.SHAREPOINT_LIST_ID) {
    _listId = process.env.SHAREPOINT_LIST_ID;
    return _listId;
  }
  const siteId = await getSiteId();
  const listName = encodeURIComponent(process.env.SHAREPOINT_LIST_NAME || 'TaskLog');
  const r = await graphFetch(`/v1.0/sites/${siteId}/lists/${listName}`);
  if (r.status !== 200) throw new Error('Failed to resolve SharePoint list: ' + JSON.stringify(r.body));
  _listId = r.body.id;
  console.log('[SharePoint] Resolved listId:', _listId);
  return _listId;
}

// ── Route handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const siteId = await getSiteId();
    const listId = await getListId();
    const base = `/v1.0/sites/${siteId}/lists/${listId}/items`;

    // GET /api/sharepoint  — fetch today's items (optionally filtered by ?email=)
    if (req.method === 'GET') {
      const email = req.query && req.query.email;
      let url = base + '?expand=fields&$top=500';
      const r = await graphFetch(url);
      if (r.status !== 200) {
        return res.status(r.status).json({ error: r.body });
      }
      let items = r.body.value || [];
      if (email) {
        items = items.filter(
          (i) => i.fields && (i.fields.StaffEmail || '').toLowerCase() === email.toLowerCase()
        );
      }
      return res.status(200).json({ value: items });
    }

    // POST /api/sharepoint  — create a new list item
    if (req.method === 'POST') {
      const r = await graphFetch(base, 'POST', { fields: req.body });
      return res.status(r.status).json(r.body);
    }

    // PATCH /api/sharepoint/:itemId  — update an existing item's fields
    if (req.method === 'PATCH') {
      const itemId = req.params && req.params.itemId;
      if (!itemId) return res.status(400).json({ error: 'itemId param required' });
      const r = await graphFetch(`${base}/${itemId}/fields`, 'PATCH', req.body);
      return res.status(r.status).json(r.body);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[SharePoint Proxy Error]', e.message);
    res.status(500).json({ error: e.message });
  }
};
