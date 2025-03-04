const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');

const storage = new Storage();

const LANDING_BUCKET = process.env.LANDING_BUCKET
const CLEAN_BUCKET = process.env.CLEAN_BUCKET
const EXPIRATION_MIN = Number(process.env.EXPIRATION_MIN) || 2; // Default expiration time: 15 minutes
const SERVICE_NAME = 'file_accessor';

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Standardized Logging Function
const logEvent = (eventType, payload = {}, severity = "INFO", status = "IN_PROGRESS") => {
  console.log(`serviceName: ${SERVICE_NAME}, eventType: ${eventType}, payload: ${JSON.stringify({
    severity, status, ...payload
  })}`);
};

// Store Audit Details (File Upload/Download)
const auditEntry = async (correlationId, userId, fileName, fileStatus, bucket) => {
  try {
    const filePath = `gs://${bucket}/${fileName}`;

    const query = `
      INSERT INTO file_activity_log (correlation_id, user_id, file_name, file_path, file_size, file_type, file_status, created_time)
      VALUES ($1, $2, $3, $4, 0, 'application/octet-stream', $5, NOW())
      RETURNING correlation_id;
    `;

    const result = await pool.query(query, [correlationId, userId, fileName, filePath, fileStatus]);

    logEvent("audit_created", { correlationId, userId, fileName, fileStatus });

    return result.rows.length > 0 ? result.rows[0].correlation_id : null;
  } catch (error) {
    logEvent("audit_failed", { correlationId, fileName, error: error.message }, "ERROR");
    throw new Error('Database insert failed');
  }
};

// Generate Signed URL
const generateSignedUrl = async (filename, userId, correlationId, uriPath, bucket) => {
  const action = uriPath === 'upload' ? "write" : "read";
  logEvent("signed_url_request", { correlationId, userId, filename, action, bucket });

  try {
    const options = {
      version: 'v4',
      action,
      expires: Date.now() + EXPIRATION_MIN * 60 * 1000,
      contentType: 'application/octet-stream',
      ...(action === 'write' && {
        extensionHeaders: { 
          'x-goog-meta-user-id': userId,
          'x-goog-meta-correlation-id': correlationId
        }
      })
    };

    const [url] = await storage.bucket(bucket).file(filename).getSignedUrl(options);
    logEvent("signed_url_success", { correlationId, userId, filename, action, signedUrl: url });

    return url;
  } catch (error) {
    logEvent("signed_url_error", { correlationId, filename, error: error.message }, "ERROR");
    throw new Error('Failed to generate signed URL');
  }
};

// Retrieve All Clean Files
const listAllFiles = async () => {
  try {
    const result = await pool.query(`SELECT file_name FROM file_activity_log WHERE file_status = 'CLEAN' ORDER BY created_time DESC;`);

    if (result.rows.length === 0) {
      logEvent("list_files_empty", { message: "No clean files available" }, "WARNING");
      return [];
    }

    const fileNames = result.rows.map(row => row.file_name);
    logEvent("list_files_success", { message: "Files retrieved", files: fileNames });

    return fileNames;
  } catch (error) {
    logEvent("list_files_error", { message: "Error retrieving clean files", error: error.message }, "ERROR");
    throw new Error("Failed to list files");
  }
};

// Handle List All Files Request
const listFilesRequest = async (req, res) => {
  try {
    const files = await listAllFiles();
    return res.status(200).json({ message: "Files available in bucket", files });
  } catch (error) {
    logEvent("list_files_failure", { error: error.message }, "ERROR");
    return res.status(500).json({ error: "Failed to list files", details: error.message });
  }
};

// Health Check
const healthCheck = async (req, res) => {
  const timestamp = new Date().toISOString();
  res.status(200).json({ message: 'Success', timestamp });
  logEvent("health_check_success", { timestamp });
};

// Validate Request Parameters
const validateRequest = (req, res) => {
  const { correlationId, userId, filename } = req.body;

  if (!correlationId || !userId || !filename) {
    logEvent("validation_error", { message: "Filename, userId, correlationId are required" }, "ERROR");
    return res.status(400).json({ error: 'Filename, userId, correlationId are required' });
  }
  return { correlationId, userId, filename };
};

// Handle Upload or Download Request
const fileAccessRequest = async (req, res, fileStatus, bucket) => {
  const requestData = validateRequest(req, res);
  if (!requestData) return;

  const { correlationId, userId, filename } = requestData;
  const uriPath = req.path.split('/').pop();

  try {
    await auditEntry(correlationId, userId, filename, fileStatus, bucket);
    const signedUrl = await generateSignedUrl(filename, userId, correlationId, uriPath, bucket);
    res.status(201).json({ message: "Signed URL generated", signedUrl }); // Changed to 201 Created
  } catch (error) {
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
};

// Cloud Function Entry Point
functions.http('fileAccess', async (req, res) => {
  logEvent("access_request", { method: req.method, path: req.path });

  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  const uriPath = req.path.split('/').pop();

  if (req.method === 'GET' && uriPath === 'health') return healthCheck(req, res);
  if (req.method === 'GET' && uriPath === 'listAll') return listFilesRequest(req, res);
  if (req.method === 'POST' && uriPath === 'upload') return fileAccessRequest(req, res, 'UPLOAD', LANDING_BUCKET);
  if (req.method === 'POST' && uriPath === 'download') return fileAccessRequest(req, res, 'DOWNLOAD', CLEAN_BUCKET);

  return res.status(405).json({ error: 'Method Not Allowed' });
});
