// builder sa
resource "google_service_account" "builder" {
  account_id   = "builder"
  display_name = "custom service account for file accessor services"
}

resource "google_project_iam_member" "builder_build_permissions" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${google_service_account.builder.email}"
}

resource "google_project_iam_member" "builder_log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.builder.email}"
}

// file ui sa
resource "google_service_account" "file_ui" {
  account_id   = "file-ui"
  display_name = "custom service account for file accessor ui"
}

resource "google_project_iam_member" "file_ui_log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.file_ui.email}"
}

// file accessor sa
resource "google_service_account" "file_accessor" {
  account_id   = "file-accessor"
  display_name = "custom service account for file accessor service"
}

resource "google_project_iam_member" "file_accessor_log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.file_accessor.email}"
}

resource "google_storage_bucket_iam_member" "file_accessor_object_admin_permissions" {
  bucket = google_storage_bucket.accessor_src_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.file_accessor.email}"
}

resource "google_storage_bucket_iam_member" "scanner_object_admin_permissions" {
  bucket = google_storage_bucket.scanner_src_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.file_accessor.email}"
}


resource "google_storage_bucket_iam_member" "file_accessor_landing_object_admin_permissions" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.file_accessor.email}"
}

// download files
resource "google_storage_bucket_iam_member" "file_accessor_clean_object_viewer_permissions" {
  bucket = google_storage_bucket.clean.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.file_accessor.email}"
}

// required to list all files from bucket
resource "google_storage_bucket_iam_member" "file_accessor_landing_object_viewer_permissions" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.file_accessor.email}"
}

resource "google_project_iam_member" "file_accessor_token_creator_permissions" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.file_accessor.email}"
}

resource "google_project_iam_member" "file_accesor_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.file_accessor.email}"
}

resource "google_project_iam_member" "file_accessor_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.file_accessor.email}"
}

// file scanning service account
resource "google_service_account" "scanner" {
  account_id   = "scanner"
  display_name = "custom service account for dlp file scan service"
}

resource "google_project_iam_member" "scanner_dlp_user" {
  project = var.project_id
  role    = "roles/dlp.admin"
  member  = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_project_iam_member" "scanner_log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_project_iam_member" "scanner_pubsub_user" {
  project = var.project_id
  role    = "roles/pubsub.admin"
  member  = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_project_iam_member" "scanner_event_arc_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_project_iam_member" "scanner_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.scanner.email}"
}


resource "google_storage_bucket_iam_member" "scanner_landing_object_admin_permissions" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_storage_bucket_iam_member" "scanner_clean_object_admin_permissions" {
  bucket = google_storage_bucket.clean.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.scanner.email}"
}

resource "google_storage_bucket_iam_member" "scanner_quarantine_object_admin_permissions" {
  bucket = google_storage_bucket.quarantine.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.scanner.email}"
}

// cloud functions build buckets
resource "google_storage_bucket_iam_member" "builder_gcf_viewer_permissions" {
  bucket = "gcf-v2-sources-${var.project_number}-europe-west2"
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.builder.email}"
}

resource "google_storage_bucket_iam_member" "builder_accessor_src_viewer_permissions" {
  bucket = google_storage_bucket.accessor_src_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.builder.email}"
}

resource "google_storage_bucket_iam_member" "builder_scanner_src_viewer_permissions" {
  bucket = google_storage_bucket.scanner_src_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.builder.email}"
}

// Service Agents 

// GCS Service Agent publisher Role 
resource "google_project_iam_member" "gcs_agent_publisher_permissions" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${var.project_number}@gs-project-accounts.iam.gserviceaccount.com"
}


resource "google_service_account_iam_member" "cloud_run_agent_sa_user" {
  service_account_id = google_service_account.file_accessor.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:service-${var.project_number}@serverless-robot-prod.iam.gserviceaccount.com"
}


