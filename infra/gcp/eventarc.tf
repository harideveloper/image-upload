
# resource "google_eventarc_trigger" "scan-trigger" {
#   project  = var.project_id
#   name     = var.application
#   location = var.region

#   matching_criteria {
#     attribute = "type"
#     value     = "google.cloud.storage.object.v1.finalized"
#   }
#   matching_criteria {
#     attribute = "bucket"
#     value     = google_storage_bucket.landing.name
#   }
#   destination {
#     cloud_run_service {
#       service = google_cloudfunctions2_function.file_scanner.name
#       region  = var.region
#       path    = "/fileScan"
#     }
#   }
#   service_account = google_service_account.scan_sa.name
#   depends_on      = [
#     google_cloudfunctions2_function.file_scanner,
#     google_service_account.scan_sa,
#     google_storage_bucket.landing
#     ]
# }
