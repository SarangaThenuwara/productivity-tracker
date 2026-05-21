const fs = require('fs');
const path = require('path');

function getStaffRoster() {
  // 1. Try to read from environment variable
  if (process.env.STAFF_ROSTER) {
    try {
      return JSON.parse(process.env.STAFF_ROSTER);
    } catch (e) {
      console.error("Error parsing STAFF_ROSTER environment variable:", e);
    }
  }

  // 2. Try to read from roster.json file
  try {
    const rosterPath = path.join(process.cwd(), 'roster.json');
    if (fs.existsSync(rosterPath)) {
      return JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading roster.json from path:", e);
  }

  // 3. Ultimate secure fallback (matching the original roster if file not present)
  return [
    { "email": "tu2@outrightbposervices.com",            "name": "Saranga Thenuwara", "department": "Operations", "role": "Agent",    "client": "Client A", "shift": "morning" },
    { "email": "staff1@outrightbposervicessdnbhd.com",   "name": "Staff Member 1",  "department": "Operations", "role": "Agent",    "client": "Client A", "shift": "morning" },
    { "email": "staff2@outrightbposervicessdnbhd.com",   "name": "Staff Member 2",  "department": "Operations", "role": "Agent",    "client": "Client A", "shift": "morning" },
    { "email": "staff3@outrightbposervicessdnbhd.com",   "name": "Staff Member 3",  "department": "Operations", "role": "Agent",    "client": "Client B", "shift": "morning" },
    { "email": "staff4@outrightbposervicessdnbhd.com",   "name": "Staff Member 4",  "department": "Operations", "role": "Agent",    "client": "Client B", "shift": "afternoon" },
    { "email": "staff5@outrightbposervicessdnbhd.com",   "name": "Staff Member 5",  "department": "Operations", "role": "Agent",    "client": "Client A", "shift": "afternoon" },
    { "email": "staff6@outrightbposervicessdnbhd.com",   "name": "Staff Member 6",  "department": "Operations", "role": "Agent",    "client": "Client C", "shift": "afternoon" },
    { "email": "staff7@outrightbposervicessdnbhd.com",   "name": "Staff Member 7",  "department": "Operations", "role": "Senior",   "client": "Client B", "shift": "morning" },
    { "email": "staff8@outrightbposervicessdnbhd.com",   "name": "Staff Member 8",  "department": "Operations", "role": "Agent",    "client": "Client C", "shift": "morning" },
    { "email": "staff9@outrightbposervicessdnbhd.com",   "name": "Staff Member 9",  "department": "Operations", "role": "Agent",    "client": "Client A", "shift": "night" },
    { "email": "staff10@outrightbposervicessdnbhd.com",  "name": "Staff Member 10", "department": "Operations", "role": "Agent",    "client": "Client C", "shift": "night" },
    { "email": "staff11@outrightbposervicessdnbhd.com",  "name": "Staff Member 11", "department": "Operations", "role": "Senior",   "client": "Client B", "shift": "night" }
  ];
}

module.exports = (req, res) => {
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

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required" });
  }

  const roster = getStaffRoster();
  const staff = roster.find(s => s.email.toLowerCase() === email.toLowerCase());

  if (!staff) {
    return res.status(404).json({ error: "Account not registered in staff roster" });
  }

  res.status(200).json(staff);
};
