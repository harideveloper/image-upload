// File Accessor Service 
resource "google_storage_bucket" "accessor_src_bucket" {
  name                        = "${var.project_id}-accessor-src-bucket"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

data "archive_file" "accessor_build_archive" {
  type        = "zip"
  source_dir  = "${path.module}/../../app/service/file-accessor"
  output_path = "${path.module}/function-accessor.zip"
}

resource "google_storage_bucket_object" "accessor_build_archive" {
  name         = "function.zip"
  bucket       = google_storage_bucket.accessor_src_bucket.name
  source       = data.archive_file.accessor_build_archive.output_path
  content_type = "application/zip"
}

resource "google_cloudfunctions2_function" "file_accessor" {
  name     = var.application
  location = var.region

  build_config {
    runtime         = "nodejs22"
    entry_point     = "fileAccess"
    service_account = google_service_account.builder.name
    source {
      storage_source {
        bucket = google_storage_bucket.accessor_src_bucket.name
        object = google_storage_bucket_object.accessor_build_archive.name
      }
    }
  }
  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 120
    environment_variables = {
      BUCKET_NAME    = google_storage_bucket.landing.name
      EXPIRATION_MIN = var.expiration_minutes
    }
    service_account_email = google_service_account.file_accessor.email
  }

  depends_on = [google_storage_bucket.accessor_src_bucket, google_storage_bucket.landing, google_project_service.apis]
}

resource "google_cloud_run_service_iam_binding" "binding" {
  location = google_cloudfunctions2_function.file_accessor.location
  project  = google_cloudfunctions2_function.file_accessor.project
  service  = google_cloudfunctions2_function.file_accessor.name
  role     = "roles/run.invoker"
  members = [
    "allUsers",
  ]
}


// DLP Service  
resource "google_storage_bucket" "scanner_src_bucket" {
  name                        = "${var.project_id}-scanner-src-bucket"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

data "archive_file" "scanner_build_archive" {
  type        = "zip"
  source_dir  = "${path.module}/../../app/service/file-scanner"
  output_path = "${path.module}/function-scanner.zip"
}

resource "google_storage_bucket_object" "scanner_build_archive" {
  name         = "function.zip"
  bucket       = google_storage_bucket.scanner_src_bucket.name
  source       = data.archive_file.scanner_build_archive.output_path
  content_type = "application/zip"
}

resource "google_cloudfunctions2_function" "file_scanner" {
  name     = "file-scanner"
  location = var.region

  build_config {
    runtime         = "nodejs22"
    entry_point     = "fileScan"
    service_account = google_service_account.builder.name
    source {
      storage_source {
        bucket = google_storage_bucket.scanner_src_bucket.name
        object = google_storage_bucket_object.scanner_build_archive.name
      }
    }
  }
  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 120
    environment_variables = {
      PROJECT_ID        = var.project_id
      LANDING_BUCKET    = google_storage_bucket.landing.name
      CLEAN_BUCKET      = google_storage_bucket.clean.name
      QUARANTINE_BUCKET = google_storage_bucket.quarantine.name
      DLP_TOPIC         = google_pubsub_topic.dlp_scan.name
      DLP_SUBSCRIPTION  = google_pubsub_subscription.dlp_scan_subscription.name
      DLP_ENABLED       = "false"

    }
    service_account_email = google_service_account.scanner.email
  }

  event_trigger {
    event_type            = "google.cloud.storage.object.v1.finalized"
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.scanner.email
    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.landing.name
    }
  }

  depends_on = [
    google_storage_bucket.scanner_src_bucket,
    google_storage_bucket.landing,
    google_storage_bucket.clean,
    google_storage_bucket.quarantine,
    google_project_service.apis,
    google_service_account.scanner
  ]
}

resource "google_cloud_run_service_iam_binding" "scanner_invoker" {
  location = google_cloudfunctions2_function.file_scanner.location
  project  = google_cloudfunctions2_function.file_scanner.project
  service  = google_cloudfunctions2_function.file_scanner.name
  role     = "roles/run.invoker"
  members = [
    "serviceAccount:${google_service_account.scanner.email}"
  ]

  depends_on = [
    google_cloudfunctions2_function.file_scanner,
    google_service_account.scanner
  ]
}