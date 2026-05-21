require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Bind API Handlers (Mimic Vercel serverless functions locally)
const configHandler = require('./api/config');
const userHandler = require('./api/user');

app.get('/api/config', (req, res) => {
  configHandler(req, res);
});

app.get('/api/user', (req, res) => {
  userHandler(req, res);
});

// Serve static assets in root
app.use(express.static(__dirname));

// Custom rewrites to match Vercel configurations exactly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'productivity-tracker.html'));
});

// Fallback to index.html for general SPA/Clean URL behaviors
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Outright BPO Productivity Tracker Dev Server Active`);
  console.log(`   Local URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
