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

  const listIdentifier =
    process.env.SHAREPOINT_LIST_ID ||
    process.env.SHAREPOINT_LIST_NAME ||
    "TaskLog";

  console.log(`[Config] Using SharePoint list identifier: ${listIdentifier}`);

  res.status(200).json({
    clientId: process.env.AZURE_CLIENT_ID || "YOUR_AZURE_APP_CLIENT_ID",
    tenantId: process.env.AZURE_TENANT_ID || "YOUR_AZURE_TENANT_ID",
    sharePointHost: process.env.SHAREPOINT_HOST || "outrightbposervicessdnbhd.sharepoint.com",
    sharePointSite: process.env.SHAREPOINT_SITE || "OutrightProductivity",
    listName: listIdentifier,
  });
};
