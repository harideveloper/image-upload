const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { DlpServiceClient } = require('@google-cloud/dlp');
const { PubSub } = require('@google-cloud/pubsub');

const storage = new Storage();
const pubsub = new PubSub();
const dlp = new DlpServiceClient();

const PROJECT_ID = process.env.PROJECT_ID;
const LANDING_BUCKET = process.env.LANDING_BUCKET;
const CLEAN_BUCKET = process.env.CLEAN_BUCKET;
const QUARANTINE_BUCKET = process.env.QUARANTINE_BUCKET;
const TOPIC_NAME = process.env.DLP_TOPIC;
const SUBSCRIPTION_NAME = process.env.DLP_SUBSCRIPTION;
const DLP_ENABLED = process.env.DLP_ENABLED === "true";

const minLikelihood = "LIKELY";
const maxFindings = 0; // 0 ==> unlimited
const DLP_JOB_WAIT_TIME = 5 * 1000 * 60; // 15 minutes

const service_name = "file_Scanner"

// Standardized log function with serviceName, eventType first, and payload
function logEvent(eventType, payload = {}, severity = "INFO", status = "IN_PROGRESS") {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - {serviceName: ${service_name}, eventType: ${eventType}, payload: ${JSON.stringify({
    timestamp, severity, status, ...payload
  })}}`);
}

// Move file between buckets
const moveFile = async (sourceBucket, destinationBucket, filename) => {
  logEvent("move_file", { filename, sourceBucket, destinationBucket }, "INFO", "STARTED");

  try {
    await storage.bucket(sourceBucket).file(filename).copy(storage.bucket(destinationBucket).file(filename));
    logEvent("move_file", { filename, sourceBucket, destinationBucket }, "INFO", "SUCCESS");
  } catch (error) {
    logEvent("move_file", { filename, sourceBucket, destinationBucket, error: error.message }, "ERROR", "FAILED");
  }
};

// DLP Classification Processing
const classify = async (filename) => {
  logEvent("file_scan", { filename }, "INFO", "STARTED");

  try {
    const fileUri = `gs://${LANDING_BUCKET}/${filename}`;
    const request = {
      parent: `projects/${PROJECT_ID}/locations/europe-west2`,
      inspectJob: {
        inspectConfig: {
          infoTypes: [{ name: "EMAIL_ADDRESS" }, { name: "CREDIT_CARD_NUMBER" }],
          minLikelihood,
          limits: { maxFindingsPerRequest: maxFindings },
        },
        storageConfig: {
          cloudStorageOptions: { fileSet: { url: fileUri } },
        },
        actions: [{ pubSub: { topic: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}` } }],
      },
    };

    const [jobsResponse] = await dlp.createDlpJob(request);
    const jobName = jobsResponse.name;
    logEvent("dlp_job", { jobName }, "INFO", "CREATED");

    const [topicResponse] = await pubsub.topic(TOPIC_NAME).get();
    const subscription = topicResponse.subscription(SUBSCRIPTION_NAME);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for DLP job result")), DLP_JOB_WAIT_TIME);

      const messageHandler = (message) => {
        if (message.attributes?.DlpJobName === jobName) {
          message.ack();
          subscription.removeListener("message", messageHandler);
          subscription.removeListener("error", errorHandler);
          clearTimeout(timer);
          resolve(jobName);
        } else {
          message.nack();
        }
      };

      const errorHandler = (err) => {
        subscription.removeListener("message", messageHandler);
        subscription.removeListener("error", errorHandler);
        clearTimeout(timer);
        reject(err);
      };

      subscription.on("message", messageHandler);
      subscription.on("error", errorHandler);
    });

    const [job] = await dlp.getDlpJob({ name: jobName });
    logEvent("dlp_job", { jobName, jobState: job.state }, "INFO", "COMPLETED");

    const infoTypeStats = job.inspectDetails.result.infoTypeStats;
    if (infoTypeStats.length > 0) {
      infoTypeStats.forEach(infoTypeStat => {
        logEvent("sensitive_data_detected", { filename, count: infoTypeStat.count, type: infoTypeStat.infoType.name }, "WARNING", "DETECTED");
      });
      await moveFile(LANDING_BUCKET, QUARANTINE_BUCKET, filename);
    } else {
      logEvent("sensitive_data_free", { filename }, "INFO", "CLEAN");
      await moveFile(LANDING_BUCKET, CLEAN_BUCKET, filename);
    }
  } catch (error) {
    logEvent("file_scan", { filename, error: error.message }, "ERROR", "FAILED");
  }
};

// Cloud Function Event Trigger
functions.cloudEvent("fileScan", async (cloudEvent) => {
  logEvent("file_scan_event", { eventId: cloudEvent.id, eventType: cloudEvent.type }, "INFO", "RECEIVED");

  try {
    if (!cloudEvent?.data?.bucket || !cloudEvent?.data?.name) {
      logEvent("file_scan_event", { eventId: cloudEvent.id, error: "Missing bucket or filename" }, "ERROR", "FAILED");
      return;
    }

    const { bucket, name, metageneration } = cloudEvent.data;
    logEvent("file_scan_event", { eventId: cloudEvent.id, bucket, filename: name }, "INFO", "INITIATED");

    if (metageneration && metageneration !== "1") {
      logEvent("file_scan_event", { filename: name, metageneration }, "INFO", "SKIPPED_METADATA_UPDATE");
      return;
    }

    if (DLP_ENABLED) {
      await classify(name);
    } else {
      logEvent("dlp_status", { filename: name }, "INFO", "DISABLED");
    }
  } catch (error) {
    logEvent("file_scan_event", { eventId: cloudEvent.id, error: error.message }, "ERROR", "FAILED");
  }
});
