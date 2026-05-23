const { graphFetch, getSiteId } = require('./_graph');

let _rosterListId = null;

async function getRosterListId() {
  if (_rosterListId) return _rosterListId;
  const siteId = await getSiteId();
  const listName = 'StaffRoster';
  const r = await graphFetch(`/v1.0/sites/${siteId}/lists/${listName}`);
  if (r.status !== 200) throw new Error('Failed to resolve StaffRoster list: ' + JSON.stringify(r.body));
  _rosterListId = r.body.id;
  return _rosterListId;
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
    const siteId = await getSiteId();
    const listId = await getRosterListId();
    
    // Fetch from StaffRoster
    const url = `/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=500`;
    const r = await graphFetch(url);
    if (r.status !== 200) {
      return res.status(r.status).json({ error: r.body });
    }

    const items = r.body.value || [];
    const staffMatch = items.find(i => 
      i.fields && 
      i.fields.Email && 
      i.fields.Email.toLowerCase() === email.toLowerCase()
    );

    if (!staffMatch) {
      return res.status(404).json({ error: "Account not registered in StaffRoster SharePoint list" });
    }

    const f = staffMatch.fields;
    const staff = {
      email: f.Email,
      name: f.Name,
      department: f.Department,
      role: f.Role,
      client: f.Client,
      shift: f.Shift
    };

    res.status(200).json(staff);
  } catch (error) {
    console.error('[User Roster Error]', error);
    res.status(500).json({ error: error.message });
  }
};
