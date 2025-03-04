resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "cloudfunctions.googleapis.com",
    "storage.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "servicenetworking.googleapis.com",
    # "iap.googleapis.com", 
    "cloudresourcemanager.googleapis.com",
    "dlp.googleapis.com",
    "serviceusage.googleapis.com",
    "pubsub.googleapis.com",
    "eventarc.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "sqladmin.googleapis.com",
  ])
  project = var.project_id
  service = each.key
  #   deletion_protection = false
  disable_dependent_services = false
}