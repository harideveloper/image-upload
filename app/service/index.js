const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const expiration = process.env.EXPIRATION_MIN;

// Logger utility function for structured logging
function logInfo(message, metadata = {}) {
  console.log(`[INFO] ${message}`, metadata);
}

function logError(message, error) {
  console.error(`[ERROR] ${message}`, error);
}

// Helper function to generate a signed URL for file upload
async function generateSignedUrl(filename) {
  const options = {
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiration * 60 * 1000, // minutes
    contentType: 'application/octet-stream',
  };

  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(filename)
      .getSignedUrl(options);

    logInfo(`Successfully generated signed URL for file: ${filename}`, { filename, signedUrl: url });

    return url;
  } catch (error) {
    logError(`Error generating signed URL for file: ${filename}`, error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * HTTP function that supports file upload signed URL generation and health check.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
functions.http('uploadFile', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*'); // Change to specific origin to allow invocation from known source

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }

  // Health Check
  if (req.method === 'GET') {
    const timestamp = new Date().toISOString();
    logInfo('Health Check Request received', { timestamp });

    return res.status(200).json({
      message: 'Sucess',
      timestamp: timestamp,
    });
  }

  // Generate Signed URL
  if (req.method === 'POST') {
    const { filename } = req.body;

    if (!filename) {
      logError('Filename is required in the request body', req.body);
      return res.status(400).json({ error: 'Filename is required' });
    }

    logInfo('Received request to process file', { filename });

    try {
      const signedUrl = await generateSignedUrl(filename);
      return res.status(200).json({
        message: 'Signed URL generated successfully',
        signedUrl: signedUrl,
      });
    } catch (error) {
      logError('Failed to process file upload request', error);
      return res.status(500).json({ error: 'Failed to generate signed URL' });
    }
  }

  // Handle Unsupported HTTP methods
  logError('Method Not Allowed', { method: req.method });
  return res.status(405).json({ error: 'Method Not Allowed' });
});
