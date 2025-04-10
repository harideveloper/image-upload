const { GoogleAuth } = require('google-auth-library');
const functions = require('@google-cloud/functions-framework');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const API = process.env.API || "https://europe-west2-dev2-ea8f.cloudfunctions.net/file-accessor"

async function getIdToken() {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(API);
  const token = await client.idTokenProvider.fetchIdToken(API);
  return token;
}

functions.http('fileUI', async (req, res) => {
  if (req.path === '/health') {
    try {
      const token = await getIdToken();
      const response = await fetch(`${API}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Backend status:", response.status);
      console.log("Backend statusText:", response.statusText);
      console.log("Backend headers:", JSON.stringify([...response.headers]));

      const text = await response.text(); // Read raw response as text

      console.log("Raw backend response body:", text);

      if (!response.ok) {
        throw new Error(`Backend request failed with status: ${response.status} ${response.statusText}`);
      }

      // Try to parse JSON after successful status
      const data = JSON.parse(text);
      console.log("Parsed backend data:", data);

      const healthCheck = {
        title: "Health Check",
        status: data
      };

      res.json(healthCheck);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: 'error',
        message: 'Backend health check failed',
        error: error.message
      });
    }
  } else {
    // Serve static files
    let filePath = path.join(__dirname, 'public', req.path === '/home' ? 'home.html' : req.path);

    if (!fs.existsSync(filePath)) {
      res.status(404).send('404 - Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  }
});

