module.exports = (req, res) => {
  // Set CORS headers for Vercel functions to support any local dev domain if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const listName = process.env.SHAREPOINT_LIST_NAME || "TaskLog";
  // listId is the raw GUID — when present, Graph API lookup is skipped entirely
  const listId   = process.env.SHAREPOINT_LIST_ID   || null;

  console.log(`[Config] listName=${listName}  listId=${listId || "(auto-discover)"}`);

  res.status(200).json({
    clientId:       process.env.AZURE_CLIENT_ID  || "YOUR_AZURE_APP_CLIENT_ID",
    tenantId:       process.env.AZURE_TENANT_ID  || "YOUR_AZURE_TENANT_ID",
    sharePointHost: process.env.SHAREPOINT_HOST  || "outrightbposervicessdnbhd.sharepoint.com",
    sharePointSite: process.env.SHAREPOINT_SITE  || "OutrightProductivity",
    listName,   // human-readable name used for fallback discovery
    listId,     // GUID — if set, used directly without any API scan
  });
};
