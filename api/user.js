const { graphFetch, getSiteId } = require('./_graph');

let _rosterListId = null;

const fs = require('fs');
const path = require('path');

async function getRosterListId() {
  if (_rosterListId) return _rosterListId;
  const siteId = await getSiteId();
  const listName = 'StaffRoster';
  const r = await graphFetch(`/v1.0/sites/${siteId}/lists/${listName}`);
  if (r.status !== 200) throw new Error('Failed to resolve StaffRoster list: ' + JSON.stringify(r.body));
  _rosterListId = r.body.id;
  return _rosterListId;
}

function getStaffFromLocalRoster(email) {
  try {
    const rosterPath = path.join(__dirname, '..', 'roster.json');
    if (fs.existsSync(rosterPath)) {
      const rosterData = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
      return rosterData.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
  } catch (e) {
    console.error('Error reading local roster:', e);
  }
  return null;
}

module.exports = async (req, res) => {
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

  try {
    let staffMatch = null;
    let fromSharePoint = false;

    try {
      const siteId = await getSiteId();
      const listId = await getRosterListId();
      
      const url = `/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=500`;
      const r = await graphFetch(url);
      
      if (r.status === 200) {
        const items = r.body.value || [];
        staffMatch = items.find(i => 
          i.fields && 
          i.fields.Email && 
          i.fields.Email.toLowerCase() === email.toLowerCase()
        );
        if (staffMatch) {
          fromSharePoint = true;
          const f = staffMatch.fields;
          return res.status(200).json({
            email: f.Email,
            name: f.Name,
            department: f.Department,
            role: f.Role,
            client: f.Client,
            shift: f.Shift
          });
        }
      }
    } catch (spError) {
      console.log('[User Roster] SharePoint StaffRoster lookup failed, falling back to roster.json.', spError.message);
    }

    if (!staffMatch) {
      // Fallback to local roster
      const localStaff = getStaffFromLocalRoster(email);
      if (localStaff) {
        return res.status(200).json(localStaff);
      }
      return res.status(404).json({ error: "Account not registered in StaffRoster or local roster" });
    }

  } catch (error) {
    console.error('[User Roster Error]', error);
    res.status(500).json({ error: error.message });
  }
};
