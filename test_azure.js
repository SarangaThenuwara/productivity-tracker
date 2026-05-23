require('dotenv').config();
const https = require('https');
const querystring = require('querystring');

async function testAuth() {
  console.log("Testing Azure Authentication...");
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  console.log("Tenant ID:", tenantId ? tenantId.substring(0, 8) + "..." : "MISSING");
  console.log("Client ID:", clientId ? clientId.substring(0, 8) + "..." : "MISSING");
  console.log("Client Secret:", clientSecret ? clientSecret.substring(0, 5) + "..." + clientSecret.substring(clientSecret.length - 5) : "MISSING");

  if (!tenantId || !clientId || !clientSecret) {
    console.error("Missing environment variables!");
    return;
  }

  const body = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const req = https.request({
    hostname: 'login.microsoftonline.com',
    path: `/${tenantId}/oauth2/v2.0/token`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log("Response Status:", res.statusCode);
      try {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          console.log("✅ SUCCESS! Valid secret and successful authentication.");
        } else {
          console.error("❌ FAILED!");
          console.error(parsed);
        }
      } catch(e) {
         console.error("Raw Response:", data);
      }
    });
  });

  req.on('error', console.error);
  req.write(body);
  req.end();
}

testAuth();
