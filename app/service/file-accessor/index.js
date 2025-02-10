const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const bucketName = process.env.BUCKET_NAME;
const expiration = process.env.EXPIRATION_MIN;

// Define service name as a global variable
const serviceName = 'file_accessor';

// Standardized log function with serviceName, eventType first, and payload
function logEvent(eventType, payload = {}, severity = "INFO", status = "IN_PROGRESS") {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - {serviceName: ${serviceName}, eventType: ${eventType}, payload: ${JSON.stringify({
    timestamp, severity, status, ...payload
  })}}`);
}

// List all files
async function listAllFiles() {
  logEvent("list_files_request", { message: "Listing files in bucket", bucket: bucketName });

  try {
    const [files] = await storage.bucket(bucketName).getFiles();
    if (!files.length) {
      logEvent("list_files", { message: "No files available", bucket: bucketName }, "WARNING");
      return [];
    }

    const fileNames = files.map(file => file.name);
    logEvent("list_files_success", { message: "Files retrieved", bucket: bucketName, files: fileNames });
    return fileNames;
  } catch (error) {
    logEvent("list_files_error", { message: "Error listing files", error: error.message }, "ERROR");
    throw new Error("Failed to list files");
  }
}

// Generate signed URL for upload/download
async function generateSignedUrl(filename, uriPath) {
  const action = uriPath === 'upload' ? "write" : "read";
  logEvent("generate_signed_url_request", { filename, action, bucket: bucketName });

  try {
    const options = {
      version: 'v4',
      action,
      expires: Date.now() + expiration * 60 * 1000,
      contentType: 'application/octet-stream',
    };

    const [url] = await storage.bucket(bucketName).file(filename).getSignedUrl(options);
    logEvent("generate_signed_url_success", { filename, action, bucket: bucketName, signedUrl: url });
    return url;
  } catch (error) {
    logEvent("generate_signed_url_error", { message: `Error generating signed URL for ${filename}`, error: error.message }, "ERROR");
    throw new Error('Failed to generate signed URL');
  }
}

// Health Check
async function healthCheck(req, res) {
  logEvent("health_check_request", { message: "Health check triggered" });

  const timestamp = new Date().toISOString();
  res.status(200).json({ message: 'Success', timestamp });

  logEvent("health_check_success", { message: "Health check completed", timestamp });
}

// Cloud Function Entry Point
functions.http('fileAccess', async (req, res) => {
  logEvent("request_received", { method: req.method, path: req.path });

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
      logEvent("list_files_failure", { error: error.message }, "ERROR");
      return res.status(500).json({ error: "Failed to list files", details: error.message });
    }
  }

  if (req.method === 'POST' && uriPath === 'upload') {
    const { filename } = req.body;
    if (!filename) {
      logEvent("file_upload_error", { message: "Filename is required" }, "ERROR");
      return res.status(400).json({ error: 'Filename is required' });
    }

    try {
      const signedUrl = await generateSignedUrl(filename, uriPath);
      logEvent("file_upload_requested", { filename, bucket: bucketName });
      return res.status(200).json({ message: "Signed URL generated", signedUrl });
    } catch (error) {
      logEvent("file_upload_failure", { error: error.message }, "ERROR");
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
  }

  if (req.method === 'POST' && uriPath === 'download') {
    const { filename } = req.body;
    if (!filename) {
      logEvent("file_download_error", { message: "Filename is required" }, "ERROR");
      return res.status(400).json({ error: 'Filename is required' });
    }

    try {
      const signedUrl = await generateSignedUrl(filename, uriPath);
      logEvent("file_download_requested", { filename, bucket: bucketName });
      return res.status(200).json({ message: "Signed URL generated", signedUrl });
    } catch (error) {
      logEvent("file_download_failure", { error: error.message }, "ERROR");
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
  }

  logEvent("invalid_request", { message: "Method not allowed", method: req.method, path: req.path }, "WARNING");
  return res.status(405).json({ error: 'Method Not Allowed' });
});
