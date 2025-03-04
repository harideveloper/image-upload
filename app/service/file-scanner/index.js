const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { DlpServiceClient } = require('@google-cloud/dlp');
const { PubSub } = require('@google-cloud/pubsub');
const { Pool } = require('pg');

const storage = new Storage();
const pubsub = new PubSub();
const dlp = new DlpServiceClient();

const SERVICE_NAME = "file_Scanner";
const PROJECT_ID = process.env.PROJECT_ID;
const LANDING_BUCKET = process.env.LANDING_BUCKET;
const CLEAN_BUCKET = process.env.CLEAN_BUCKET;
const QUARANTINE_BUCKET = process.env.QUARANTINE_BUCKET;
const TOPIC_NAME = process.env.DLP_TOPIC;
const SUBSCRIPTION_NAME = process.env.DLP_SUBSCRIPTION;
const DLP_ENABLED = "true";

const MIN_LIKELIHOOD = "LIKELY";
const MAX_FINDINGS = 0;
const DLP_JOB_WAIT_TIME = 5 * 60 * 1000;

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// Log Event
const logEvent = (eventType, payload = {}, severity = "INFO", status = "IN_PROGRESS") => {
  console.log(`serviceName: ${SERVICE_NAME}, eventType: ${eventType}, payload: ${JSON.stringify({
    severity, status, ...payload
  })}`);
};

// Store Audit Entry (File Upload/Download)
const auditEntry = async (correlationId, userId, fileName, fileStatus) => {
  try {
    const filePath = `gs://${LANDING_BUCKET}/${fileName}`;
    const query = `
      INSERT INTO file_acitivity_log (correlation_id, user_id, file_name, file_path, file_size, file_type, file_status, created_time)
      VALUES ($1, $2, $3, $4, 0, 'application/octet-stream', $5, NOW());
    `;
    await pool.query(query, [correlationId, userId, fileName, filePath, fileStatus]);
    logEvent("audit_entry_created", { correlationId, userId, fileName, fileStatus }, "INFO", "SUCCESS");
  } catch (error) {
    logEvent("audit_entry_failed", { correlationId, userId, fileName, error: error.message }, "ERROR", "FAILED");
    throw new Error("Database insert failed");
  }
};

// Store Scan Results
const storeScanDetails = async (correlationId, userId, fileName, scanStatus, detectedInfoTypes = []) => {
  try {
    const query = `
      INSERT INTO file_scan_results (correlation_id, user_id, file_name, scan_status, sensitive_data_found, sensitive_data_types, scan_time)
      VALUES ($1, $2, $3, $4, $5, $6, NOW());
    `;
    const sensitiveDataFound = detectedInfoTypes.length > 0;
    const detectedTypesStr = detectedInfoTypes.join(", ");

    await pool.query(query, [correlationId, userId, fileName, scanStatus, sensitiveDataFound, detectedTypesStr]);
    logEvent("scan_details_saved", { correlationId, userId, fileName, scanStatus, detectedInfoTypes }, "INFO", "SUCCESS");
  } catch (error) {
    logEvent("scan_details_failed", { correlationId, userId, fileName, error: error.message }, "ERROR", "FAILED");
    throw new Error("Database insert failed");
  }
};

// Move File Between Buckets
const moveFile = async (sourceBucket, destinationBucket, filename) => {
  try {
    await storage.bucket(sourceBucket).file(filename).copy(storage.bucket(destinationBucket).file(filename));
    logEvent("file_moved", { filename, sourceBucket, destinationBucket }, "INFO", "SUCCESS");
  } catch (error) {
    logEvent("file_move_failed", { filename, sourceBucket, destinationBucket, error: error.message }, "ERROR", "FAILED");
  }
};

// Wait for DLP Job Completion
const waitForDlpJob = async (jobName, subscription) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for DLP job result")), DLP_JOB_WAIT_TIME);

    const messageHandler = (message) => {
      if (message.attributes?.DlpJobName === jobName) {
        message.ack();
        clearTimeout(timer);
        subscription.removeListener("message", messageHandler);
        resolve(jobName);
      } else {
        message.nack();
      }
    };

    subscription.on("message", messageHandler);
  });
};

// Perform DLP Scan on File
const classify = async (filename, userId, correlationId) => {
  logEvent("scan_start", { correlationId, userId, filename }, "INFO", "STARTED");

  try {
    const fileUri = `gs://${LANDING_BUCKET}/${filename}`;
    const request = {
      parent: `projects/${PROJECT_ID}/locations/global`,
      inspectJob: {
        inspectConfig: {
          infoTypes: [{ name: "EMAIL_ADDRESS" }, { name: "CREDIT_CARD_NUMBER" }],
          minLikelihood: MIN_LIKELIHOOD,
          limits: { maxFindingsPerRequest: MAX_FINDINGS },
        },
        storageConfig: {
          cloudStorageOptions: { fileSet: { url: fileUri } },
        },
        actions: [{ pubSub: { topic: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}` } }],
      },
    };

    const [jobsResponse] = await dlp.createDlpJob(request);
    const jobName = jobsResponse.name;
    logEvent("dlp_job_created", { correlationId, userId, jobName }, "INFO", "IN_PROGRESS");

    const [topicResponse] = await pubsub.topic(TOPIC_NAME).get();
    const subscription = topicResponse.subscription(SUBSCRIPTION_NAME);

    await waitForDlpJob(jobName, subscription);

    const [job] = await dlp.getDlpJob({ name: jobName });
    const infoTypeStats = job.inspectDetails.result.infoTypeStats;
    let detectedInfoTypes = infoTypeStats.map((info) => info.infoType.name);

    if (detectedInfoTypes.length > 0) {
      logEvent("sensitive_data_detected", { correlationId, userId, filename, detectedInfoTypes }, "WARNING", "DETECTED");
      await moveFile(LANDING_BUCKET, QUARANTINE_BUCKET, filename);
      await auditEntry(correlationId, userId, filename, "QUARANTINED");
    } else {
      logEvent("no_sensitive_data_found", { filename }, "INFO", "CLEAN");
      await moveFile(LANDING_BUCKET, CLEAN_BUCKET, filename);
      await auditEntry(correlationId, userId, filename, "CLEAN");
    }

    await storeScanDetails(correlationId, userId, filename, detectedInfoTypes.length > 0 ? "QUARANTINED" : "CLEAN", detectedInfoTypes);
  } catch (error) {
    logEvent("dlp_scan_failed", { correlationId, userId, filename, error: error.message }, "ERROR", "FAILED");
  }
};

// Cloud Function Trigger
functions.cloudEvent("fileScan", async (cloudEvent) => {
  logEvent("scan_request_received", { eventId: cloudEvent.id }, "INFO");

  const { bucket, name, metadata } = cloudEvent.data || {};
  if (!bucket || !name || !metadata?.["user-id"] || !metadata?.["correlation-id"]) {
    logEvent("scan_missing_metadata", { eventId: cloudEvent.id, error: "Missing required metadata" }, "ERROR", "FAILED");
    return;
  }

  if (DLP_ENABLED) await classify(name, metadata["user-id"], metadata["correlation-id"]);
  else logEvent("dlp_disabled", { filename: name }, "INFO", "DISABLED");
});
