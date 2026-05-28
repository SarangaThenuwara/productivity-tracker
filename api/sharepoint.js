/**
 * api/sharepoint.js
 * Server-side SharePoint proxy — uses app-only token (client_credentials) so
 * individual users do NOT need SharePoint permissions. The app's
 * Sites.FullControl.All application permission handles everything.
 */

require('dotenv').config();
const { graphFetch, getSiteId } = require('./_graph');

let _listId = null;

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
    // itemId is injected as a query param by vercel.json rewrite: /api/sharepoint/:itemId → ?itemId=:itemId
    if (req.method === 'PATCH') {
      let itemId = req.query && req.query.itemId;
      if (!itemId && req.url && req.url.includes('?')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        itemId = urlParams.get('itemId');
      }
      if (!itemId && req.url) {
        itemId = req.url.split('?')[0].split('/').filter(Boolean).pop();
      }
      if (!itemId || itemId === 'sharepoint') return res.status(400).json({ error: 'itemId param required' });
      const r = await graphFetch(`${base}/${itemId}/fields`, 'PATCH', req.body);
      return res.status(r.status).json(r.body);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[SharePoint Proxy Error]', e.message);
    res.status(500).json({ error: e.message });
  }
};
