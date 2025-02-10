const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { Logging } = require('@google-cloud/logging');

const storage = new Storage();
const logging = new Logging();

const bucketName = process.env.BUCKET_NAME;
const expiration = process.env.EXPIRATION_MIN;

// Log functions
async function logEvent(eventType, details) {
  const log = logging.log('file-access');
  const metadata = { resource: { type: 'global' } };
  const entry = log.entry(metadata, { eventType, ...details, timestamp: new Date().toISOString() });
  await log.write(entry);
  console.log(`[LOGGED] event_type :${eventType}:`, details);
}

// List all files
async function listAllFiles() {
  try {
    const [files] = await storage.bucket(bucketName).getFiles();
    if (!files.length) {
      logEvent("list_files", { message: "No files available", bucket: bucketName });
      return [];
    }

    const fileNames = files.map(file => file.name);
    logEvent("list_files", { message: "Files listed", bucket: bucketName, files: fileNames });
    return fileNames;
  } catch (error) {
    logEvent("error", { message: "Error listing files", error: error.message });
    throw new Error("Failed to list files");
  }
}

// Generate signed URL for upload/download
async function generateSignedUrl(filename, uriPath) {
  try {
    const action = uriPath === 'upload' ? "write" : "read";
    const options = {
      version: 'v4',
      action: action,
      expires: Date.now() + expiration * 60 * 1000,
      contentType: 'application/octet-stream',
    };

    const [url] = await storage.bucket(bucketName).file(filename).getSignedUrl(options);
    logEvent("generate_signed_url", { filename, action, bucket: bucketName, signedUrl: url });
    return url;
  } catch (error) {
    logEvent("error", { message: `Error generating signed URL for ${filename}`, error: error.message });
    throw new Error('Failed to generate signed URL');
  }
}

// Health Check
async function healthCheck(req, res) {
  const timestamp = new Date().toISOString();
  logEvent("health_check", { message: "Health Check Requested", timestamp });
  res.status(200).json({ message: 'Success', timestamp });
}

// Cloud Function Entry Point
functions.http('fileAccess', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  const uriPath = req.path.split('/').pop();

  if (req.method === 'GET' && uriPath === 'health') return healthCheck(req, res);

  if (req.method === 'GET' && uriPath === 'listAll') {
    try {
      const files = await listAllFiles();
      return res.status(200).json({ message: "Files available in bucket", files });
    } catch (error) {
      return res.status(500).json({ error: "Failed to list files", details: error.message });
    }
  }

  if (req.method === 'POST' && uriPath === 'upload') {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    try {
      const signedUrl = await generateSignedUrl(filename, uriPath);
      logEvent("file_upload_requested", { filename, bucket: bucketName });
      return res.status(200).json({ message: "Signed URL generated", signedUrl });
    } catch (error) {
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
  }

  if (req.method === 'POST' && uriPath === 'download') {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    try {
      const signedUrl = await generateSignedUrl(filename, uriPath);
      logEvent("file_download_requested", { filename, bucket: bucketName });
      return res.status(200).json({ message: "Signed URL generated", signedUrl });
    } catch (error) {
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
});
