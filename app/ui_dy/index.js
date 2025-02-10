const functions = require('@google-cloud/functions-framework');
const fs = require('fs');
const path = require('path');

functions.http('serveHtml', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading HTML file.');
      return;
    }
    res.set('Content-Type', 'text/html');
    res.status(200).send(data);
  });
});
