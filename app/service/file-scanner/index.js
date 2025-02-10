const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { DlpServiceClient } = require('@google-cloud/dlp');
const { PubSub } = require('@google-cloud/pubsub');
const { Logging } = require('@google-cloud/logging');
const { timeStamp } = require('console');

const storage = new Storage();
const pubsub = new PubSub();
const dlp = new DlpServiceClient();
const logging = new Logging();

const PROJECT_ID = process.env.PROJECT_ID
const LANDING_BUCKET = process.env.LANDING_BUCKET;
const CLEAN_BUCKET = process.env.CLEAN_BUCKET;
const QUARANTINE_BUCKET = process.env.QUARANTINE_BUCKET;
const TOPIC_NAME = process.env.DLP_TOPIC
const SUBSCRIPTION_NAME = process.env.DLP_SUBSCRIPTION
const DLP_ENABLED = process.env.DLP_ENABLED === "true";

// DLP Configurations 
const infoTypes = [
  // General PII Identifiers
  { name: "ADVERTISING_ID" },
  { name: "AGE" },
  { name: "BLOOD_TYPE" },
  { name: "CREDIT_CARD_EXPIRATION_DATE" },
  { name: "CREDIT_CARD_NUMBER" },
  { name: "CREDIT_CARD_TRACK_NUMBER" },
  { name: "COUNTRY_DEMOGRAPHIC" },
  { name: "CVV_NUMBER" },
  { name: "DATE" },
  { name: "DATE_OF_BIRTH" },
  { name: "DEMOGRAPHIC_DATA" },
  { name: "DOMAIN_NAME" },
  { name: "DRIVERS_LICENSE_NUMBER" },
  { name: "EMAIL_ADDRESS" },
  { name: "EMPLOYMENT_STATUS" },
  { name: "ETHNIC_GROUP" },
  { name: "FINANCIAL_ACCOUNT_NUMBER" },
  { name: "FINANCIAL_ID" },
  { name: "FIRST_NAME" },
  { name: "GENDER" },
  { name: "GENERIC_ID" },
  { name: "GEOGRAPHIC_DATA" },
  { name: "GOVERNMENT_ID" },
  { name: "IBAN_CODE" },
  { name: "HTTP_COOKIE" },
  { name: "HTTP_USER_AGENT" },
  { name: "ICCID_NUMBER" },
  { name: "ICD9_CODE" },
  { name: "ICD10_CODE" },
  { name: "IMEI_HARDWARE_ID" },
  { name: "IMMIGRATION_STATUS" },
  { name: "IMSI_ID" },
  { name: "IP_ADDRESS" },
  { name: "LAST_NAME" },
  { name: "LOCATION" },
  { name: "LOCATION_COORDINATES" },
  { name: "MAC_ADDRESS" },
  { name: "MAC_ADDRESS_LOCAL" },
  { name: "MARITAL_STATUS" },
  { name: "MEDICAL_DATA" },
  { name: "MEDICAL_RECORD_NUMBER" },
  { name: "MEDICAL_TERM" },
  { name: "ORGANIZATION_NAME" },
  { name: "PASSPORT" },
  { name: "PERSON_NAME" },
  { name: "PHONE_NUMBER" },
  { name: "POLITICAL_TERM" },
  { name: "RELIGIOUS_TERM" },
  { name: "SEXUAL_ORIENTATION" },
  { name: "STREET_ADDRESS" },
  { name: "SWIFT_CODE" },
  { name: "TECHNICAL_ID" },
  { name: "TIME" },
  { name: "TRADE_UNION" },
  { name: "URL" },
  { name: "VAT_NUMBER" },
  { name: "VEHICLE_IDENTIFICATION_NUMBER" },

  // UK-Specific Identifiers
  { name: "SCOTLAND_COMMUNITY_HEALTH_INDEX_NUMBER" },
  { name: "UK_DRIVERS_LICENSE_NUMBER" },
  { name: "UK_ELECTORAL_ROLL_NUMBER" },
  { name: "UK_NATIONAL_HEALTH_SERVICE_NUMBER" },
  { name: "UK_NATIONAL_INSURANCE_NUMBER" },
  { name: "UK_PASSPORT" },
  { name: "UK_TAXPAYER_REFERENCE" },
];


const minLikelihood = "LIKELY"; 
const maxFindings = 0;  // 0 ==> unlimited

const DLP_JOB_WAIT_TIME = 5 * 1000 * 60; // 15 minutes

// log event
async function logEvent(eventType, details) {
  const log = logging.log('file-access');
  const metadata = { resource: { type: 'global' } };
  const entry = log.entry(metadata, { eventType, ...details, timestamp: new Date().toISOString() });
  await log.write(entry);
  console.log(`[LOGGED] event_type :${eventType}:`, details);
}

// log info
function logInfo(message, metadata = {}) {
  console.log(`[INFO] ${message}`, metadata);
}

// log error
function logError(message, error) {
  console.error(`[ERROR] ${message}`, error);
}

// move files 
const moveFile = async (sourceBucket, destinationBucket, filename) => {
  try {
    await storage.bucket(sourceBucket).file(filename).copy(storage.bucket(destinationBucket).file(filename));
    logInfo(`File ${filename} moved to ${destinationBucket}`);
    await logEvent("move_file", { filename, sourceBucket, destinationBucket });
  } catch (error) {
    logError(`Error moving file ${filename} to ${destinationBucket}`, error);
    await logEvent("error", { message: `Error moving file ${filename}`, error: error.message });
  }
};

// dlp processing
const classify = async (filename) => {
  try {
    const fileUri = `gs://${LANDING_BUCKET}/${filename}`;
    const storageItemConfig = {
      cloudStorageOptions: {
        fileSet: { url: fileUri },
      },
    };

    const request = {
      parent: `projects/${PROJECT_ID}/locations/europe-west2`,
      inspectJob: {
        inspectConfig: {
          infoTypes: infoTypes,
          minLikelihood: minLikelihood,
          limits: {
            maxFindingsPerRequest: maxFindings,
          },
        },
        storageConfig: storageItemConfig,
        actions: [
          {
            pubSub: {
              topic: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`,
            },
          },
        ],
      },
    };

    const [topicResponse] = await pubsub.topic(TOPIC_NAME).get();
    const subscription = await topicResponse.subscription(SUBSCRIPTION_NAME);

    const [jobsResponse] = await dlp.createDlpJob(request);
    const jobName = jobsResponse.name;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout'));
      }, DLP_JOB_WAIT_TIME);

      const messageHandler = message => {
        if (message.attributes && message.attributes.DlpJobName === jobName) {
          message.ack();
          subscription.removeListener('message', messageHandler);
          subscription.removeListener('error', errorHandler);
          clearTimeout(timer);
          resolve(jobName);
        } else {
          message.nack();
        }
      };

      const errorHandler = err => {
        subscription.removeListener('message', messageHandler);
        subscription.removeListener('error', errorHandler);
        clearTimeout(timer);
        reject(err);
      };

      subscription.on('message', messageHandler);
      subscription.on('error', errorHandler);
    });

    const [job] = await dlp.getDlpJob({ name: jobName });
    logInfo(`Job ${job.name} status: ${job.state}`);

    const infoTypeStats = job.inspectDetails.result.infoTypeStats;
    if (infoTypeStats.length > 0) {
      infoTypeStats.forEach(infoTypeStat => {
        logError(`${filename} : Sensitive data identified | Count : ${infoTypeStat.count} | Type : ${infoTypeStat.infoType.name}`);
        logEvent("sensitive_data_found", { filename, infoTypeStat });
      });
      await moveFile(LANDING_BUCKET, QUARANTINE_BUCKET, filename);
    } else {
      logInfo(`${filename} is sensitive data free, DLP rules not required`);
      logEvent("promote_file_request", { filename });
      await moveFile(LANDING_BUCKET, CLEAN_BUCKET, filename);
    }

  } catch (error) {
    logError("Error processing file classification: ", error);
    await logEvent("error", { message: `Error processing file ${filename}`, error: error.message });
  }
}

// main function event trigger
functions.cloudEvent('fileScan', async (cloudEvent) => {
  try {
    if (!cloudEvent || !cloudEvent.id || !cloudEvent.data) {
      logError("Invalid event: Missing required fields", { event: cloudEvent });
      await logEvent("error", { message: "Invalid event: Missing required fields", event: cloudEvent });
      return;
    }

    const { id, type, data } = cloudEvent;
    if (!data.bucket || !data.name) {
      logError(`Event ${id} is missing bucket or file name`, { event: cloudEvent });
      await logEvent("error", { message: `Event ${id} is missing bucket or file name`, event: cloudEvent });
      return;
    }

    const { bucket, name, metageneration } = data;

    logInfo(`Event ${id} received: Processing ${bucket}/${name} for event type ${type}`);
    await logEvent("file_scan_event_received", { eventId: id, bucket, filename: name });

    if (metageneration && metageneration !== "1") {
      logInfo(`Skipping metadata update for file: ${name} (Metageneration: ${metageneration})`);
      await logEvent("skipped_metadata_update", { filename: name, metageneration });
      return;
    }

    if (DLP_ENABLED) {
      await classify(name);
    } else {
      logInfo(`DLP Classification is disabled by admin, skipping DLP checks for file: ${name}`);
      await logEvent("dlp_disabled", { filename: name });
    }

  } catch (error) {
    logError("Error processing event", error);
    await logEvent("error", { message: "Error processing event", error: error.message });
  }
});