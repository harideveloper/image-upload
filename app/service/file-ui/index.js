const functions = require('@google-cloud/functions-framework');
const path = require('path');
const fs = require('fs');

// Function to serve static files
functions.http('fileUI', (req, res) => {
  let filePath = '';

  // If the user requests the root path, serve index.html
  if (req.path === '/' || req.path === '/home.html') {
    filePath = path.join(__dirname, 'public/home.html');
  } else {
    filePath = path.join(__dirname, 'public', req.path);
  }

  // If file does not exist, return 404
  if (!fs.existsSync(filePath)) {
    res.status(404).send('404 - Not Found');
    return;
  }

  // Set Content-Type based on file extension
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');

  // Serve the requested file
  fs.createReadStream(filePath).pipe(res);
});
