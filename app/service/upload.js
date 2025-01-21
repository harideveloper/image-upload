const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const bodyParser = require('body-parser');
const winston = require('winston'); // Using winston for logging

const app = express();
const storage = new Storage();

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Enable CORS for all origins (you can modify this to restrict it to a specific origin)
// app.use(cors({
//   origin: 'http://localhost:3000',  // Only allow requests from your React app
//   methods: ['GET', 'POST', 'PUT'],
//   allowedHeaders: ['Content-Type'],
// }));

// Enable CORS for all origins (use carefully in production)
app.use(cors({
  origin: '*', // Allow requests from all origins for simplicity (modify this for production)
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());

const BUCKET_NAME = 'signed-url-test-rag-accelerator-dev-e694';

app.post('/generateSignedUrl', async (req, res) => {
  const { fileName, contentType } = req.body;

  // Log incoming request
  logger.info('Received request to generate signed URL');
  logger.info(`fileName: ${fileName}, contentType: ${contentType}`);

  // Check if required fields are present
  if (!fileName || !contentType) {
    logger.error('Missing fileName or contentType');
    return res.status(400).send('Missing fileName or contentType');
  }

  const options = {
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  };

  try {
    logger.info('Attempting to generate signed URL...');
    const [signedUrl] = await storage.bucket(BUCKET_NAME).file(fileName).getSignedUrl(options);

    // Log successful signed URL generation
    logger.info('Successfully generated signed URL :'+signedUrl);
    res.json({ signedUrl });
  } catch (error) {
    // Log error if any occurs
    logger.error('Error generating signed URL:', error);
    res.status(500).send('Could not generate signed URL');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
