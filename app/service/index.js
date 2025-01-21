const { Storage } = require('@google-cloud/storage');
const functions = require('@google-cloud/functions-framework');
const logger = require('@google-cloud/logging').Logging;
const logging = new logger();

const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;
const API_KEY = process.env.API_KEY; // API key set in Cloud Function environment variables

const log = logging.log('cloudfunction_logs');

// Generate Signed URL API
functions.http('generateSignedUrl', async (req, res) => {
  // Log the incoming request
  log.write(
    log.entry(
      {
        resource: {
          type: 'cloud_function',
          labels: { function_name: 'generateSignedUrl' },
        },
      },
      {
        message: 'Received request to generate signed URL',
        method: req.method,
        headers: req.headers,
        body: req.body,
      }
    )
  );

  // API Key validation
  if (req.headers['api-key'] !== API_KEY) {
    const errorMessage = 'Forbidden: Invalid API Key';
    console.error(errorMessage);
    log.write(
      log.entry(
        {
          resource: {
            type: 'cloud_function',
            labels: { function_name: 'generateSignedUrl' },
          },
        },
        { message: errorMessage }
      )
    );
    return res.status(403).send(errorMessage); // Respond with a 403 Forbidden
  }

  const { fileName, contentType, expiresInMinutes } = req.body;

  // Validate required parameters
  if (!fileName || !contentType) {
    const errorMessage = 'File name and content type are required';
    console.error(errorMessage);
    log.write(
      log.entry(
        {
          resource: {
            type: 'cloud_function',
            labels: { function_name: 'generateSignedUrl' },
          },
        },
        { message: errorMessage }
      )
    );
    return res.status(400).send(errorMessage); // Respond with a 400 Bad Request
  }

  const expirationMinutes = parseInt(expiresInMinutes || '15', 10); // Default expiration time = 15 minutes
  const expirationDate = Date.now() + expirationMinutes * 60 * 1000;

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Generate the signed URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'write',
      expires: expirationDate,
      contentType,
    });

    console.log(`Signed URL generated successfully for ${fileName}`);
    log.write(
      log.entry(
        {
          resource: {
            type: 'cloud_function',
            labels: { function_name: 'generateSignedUrl' },
          },
        },
        {
          message: `Signed URL generated successfully for ${fileName}`,
          signedUrl,
        }
      )
    );

    // Respond with the signed URL
    res.status(200).json({ signedUrl });
  } catch (error) {
    const errorMessage = `Error generating signed URL for file ${fileName}: ${error.message}`;
    console.error(errorMessage);
    log.write(
      log.entry(
        {
          resource: {
            type: 'cloud_function',
            labels: { function_name: 'generateSignedUrl' },
          },
        },
        { message: errorMessage, error: error.stack }
      )
    );
    res.status(500).send(errorMessage); // Respond with a 500 Internal Server Error
  }
});