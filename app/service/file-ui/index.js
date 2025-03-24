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

      if (!response.ok) {
        throw new Error(`Backend request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend Data:", data);
      const healthCheck = {
        title: "Health Check",
        status: data
      };
      console.log("Backend responseData:", healthCheck);

      res.json(healthCheck);
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Backend health check failed', error: error.message });
    }
  } else {
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
