// Supabase Bridge API Server
// Provides write access to Supabase for Genspark

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SUPABASE_URL = 'https://oycjhrdwibyukzlzktsr.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.API_KEY || 'change-me-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// API Key Authentication Middleware
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'supabase-bridge-api',
    timestamp: new Date().toISOString()
  });
});

// INSERT endpoint
app.post('/api/:table', requireApiKey, async (req, res) => {
  const { table } = req.params;
  const data = req.body;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE endpoint
app.patch('/api/:table', requireApiKey, async (req, res) => {
  const { table } = req.params;
  const { filter, data } = req.body;

  try {
    const filterParams = Object.entries(filter)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterParams}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE endpoint
app.delete('/api/:table', requireApiKey, async (req, res) => {
  const { table } = req.params;
  const { filter } = req.body;

  try {
    const filterParams = Object.entries(filter)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join('&');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterParams}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      const result = await response.json();
      return res.status(response.status).json({ error: result });
    }

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SELECT endpoint (optional - MCP can do this, but included for completeness)
app.get('/api/:table', requireApiKey, async (req, res) => {
  const { table } = req.params;
  const { select = '*', limit = 100, ...filters } = req.query;

  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`;
    
    Object.entries(filters).forEach(([key, value]) => {
      url += `&${key}=eq.${value}`;
    });

    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Supabase Bridge API running on port ${PORT}`);
  console.log(`📝 API Key configured: ${API_KEY !== 'change-me-in-production' ? 'YES' : 'NO - USING DEFAULT!'}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET    /health`);
  console.log(`  POST   /api/:table`);
  console.log(`  PATCH  /api/:table`);
  console.log(`  DELETE /api/:table`);
  console.log(`  GET    /api/:table`);
});
