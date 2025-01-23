// cloud functions build service account
resource "google_service_account" "cf_build_sa" {
  account_id   = "build-sa"
  display_name = "Custom Service Account for Cloud Function Build"
}

resource "google_project_iam_member" "build_permissions" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${google_service_account.cf_build_sa.email}"
}

resource "google_project_iam_member" "log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cf_build_sa.email}"
}

resource "google_storage_bucket_iam_member" "build_sa_src_access" {
  bucket = google_storage_bucket.src_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cf_build_sa.email}"
}

resource "google_storage_bucket_iam_member" "build_bucket_sa_src_access" {
  bucket = "gcf-v2-sources-627128532186-europe-west2"
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cf_build_sa.email}"
}

// cloud functions custom service account used for execution of service running in the cloud functions
resource "google_service_account" "cf_execution_sa" {
  account_id   = "execution-sa"
  display_name = "Custom Service Account for Cloud Function Execution"
}

resource "google_project_iam_member" "exec_log_permissions" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cf_execution_sa.email}"
}

resource "google_storage_bucket_iam_member" "execution_sa_src_access" {
  bucket = google_storage_bucket.src_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cf_execution_sa.email}"
}

resource "google_storage_bucket_iam_member" "execution_sa_staging_access" {
  bucket = google_storage_bucket.staging.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.cf_execution_sa.email}"
}

resource "google_project_iam_member" "cloud_function_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.cf_execution_sa.email}"
}
