# Outright BPO — Production-Grade Productivity Tracker

This repository contains the production-grade, highly secure implementation of the **Outright BPO Productivity Tracker**. 

This system integrates **Microsoft 365 Authentication (Azure AD / MSAL)**, stateful session recovery via **SharePoint List API**, and a secure server-side roster database to ensure enterprise-level privacy, scalability, and configurability.

---

## 🚀 Key Production Upgrades

1. **Security & Privacy Focus**:
   - **Zero Hardcoded Secrets**: Removed all sensitive Microsoft Client IDs, Tenant IDs, and SharePoint URLs from the client bundle.
   - **Server-Side Roster Matching**: Employee database, shifts, and email mappings are stored securely on the backend (via `roster.json` or environment variables) rather than being bundled in front-end JavaScript where they could be easily harvested.

2. **Enterprise-Grade Configuration (`.env`)**:
   - Environment variables control all endpoints, auth configurations, and site hosts.
   - Simply configure your `.env` once and deploy without code modifications.

3. **Dynamic Hot-Swapping**:
   - Roster lists or SharePoint targets can be updated in real-time without modifying client-side files or rebuilding.

4. **Production Serverless Design (Vercel)**:
   - Configured zero-latency Node.js API endpoints (`/api/config` and `/api/user`) deployed seamlessly as Vercel serverless functions.
   - Custom clean URLs (e.g., `/tracker` pointing to `productivity-tracker.html`).

---

## 🛠️ Project Structure

```
├── api/
│   ├── config.js          # API: Safely serves client-safe configuration parameters
│   └── user.js            # API: Secure server-side staff roster checking
├── .env                   # Configuration: Local development environment secrets (Git-ignored)
├── .env.example           # Reference: Standard template for developers
├── .gitignore             # Safety: Prevents committing environment secrets or node modules
├── index.html             # Client: Primary portal layout with dynamic config bootstrap
├── productivity-tracker.html # Client: Alternative route (same frontend engine)
├── package.json           # Dev: Local node script runner and backend dependencies
├── roster.json            # Database: Local staff database (fallback)
├── server.js              # Dev Server: Lightweight Express server emulating Vercel serverless routes
└── vercel.json            # Deployment: Routing, clean URLs, and Serverless runtime configuration
```

---

## 💻 Local Development Setup

To run the productivity tracker locally, follow these simple steps:

### 1. Install Dependencies
Make sure you have Node.js (v18+) installed:
```bash
npm install
```

### 2. Configure Local Environment (`.env`)
Copy the template file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Microsoft Azure AD Application Client ID and Tenant ID:
```ini
AZURE_CLIENT_ID=your-azure-app-client-id
AZURE_TENANT_ID=your-azure-tenant-id
```

### 3. Customize Your Staff Roster (`roster.json`)
You can add or remove users, shifts, departments, roles, or client details inside `roster.json` at any time. The application dynamically reads these settings at runtime.

### 4. Run the Dev Server
Start the local server:
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`** to test your application!

---

## ☁️ Vercel Cloud Deployment

This tracker is fully pre-configured to build and deploy to **Vercel** with zero configuration required!

### Step 1: Deploy Project
Using the Vercel CLI or Vercel Web Dashboard:
```bash
vercel
```

### Step 2: Configure Environment Variables
Inside your Vercel Project Dashboard, navigate to **Settings > Environment Variables** and add the following keys:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `SHAREPOINT_HOST` (e.g., `outrightbposervicessdnbhd.sharepoint.com`)
- `SHAREPOINT_SITE` (e.g., `OutrightProductivity`)
- `SHAREPOINT_LIST_NAME` (e.g., `TaskLog`)

### Step 3: Serverless Staff Roster (Optional)
For highly dynamic production rosters where you don't want to re-commit `roster.json`, you can define a **`STAFF_ROSTER`** environment variable inside your Vercel Dashboard as a JSON array. 
For example:
```json
[
  { "email": "agent@domain.com", "name": "Agent Smith", "department": "Operations", "role": "Agent", "client": "Client A", "shift": "morning" }
]
```
The serverless function will automatically read the environment variable first. If it doesn't exist, it will gracefully fall back to the default `roster.json` file.

---

## 🔒 Security Best Practices

1. **Keep `.env` Secrets Private**: Never commit `.env` to GitHub. The `.gitignore` has been pre-configured to protect it.
2. **Authorize Redirect URIs**: Ensure that your Azure AD App Registration lists both your local environment (`http://localhost:3000`) and your production Vercel URL (`https://your-domain.vercel.app`) as authorized **Single Page Application (SPA)** redirect URIs.
