resource "google_storage_bucket" "src_bucket" {
  name                        = "${var.project_id}-src-bucket"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

data "archive_file" "build_archive" {
  type        = "zip"
  source_dir  = "${path.module}/../../app/service"
  output_path = "${path.module}/function.zip"
}

resource "google_cloudfunctions2_function" "file_upload" {
  name     = "file-upload"
  location = var.region

  build_config {
    runtime         = "nodejs22"
    entry_point     = "uploadFile"
    service_account = google_service_account.cf_build_sa.name
    source {
      storage_source {
        bucket = google_storage_bucket.src_bucket.name
        object = google_storage_bucket_object.build_archive.name
      }
    }
  }
  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 120
    environment_variables = {
      BUCKET_NAME    = google_storage_bucket.staging.name
      EXPIRATION_MIN = var.expiration_minutes
    }
    service_account_email = google_service_account.cf_execution_sa.email
  }

  #   depends_on = [google_project_service.cloud_apis]
  depends_on = [google_storage_bucket.src_bucket, google_storage_bucket.staging]
}

# Upload the function zip to the bucket
resource "google_storage_bucket_object" "build_archive" {
  name         = "function.zip"
  bucket       = google_storage_bucket.src_bucket.name
  source       = data.archive_file.build_archive.output_path
  content_type = "application/zip"
}

resource "google_cloud_run_service_iam_binding" "binding" {
  location = google_cloudfunctions2_function.file_upload.location
  project = google_cloudfunctions2_function.file_upload.project
  service = google_cloudfunctions2_function.file_upload.name
  role = "roles/run.invoker"
  members = [
    "allUsers",
  ]
}


