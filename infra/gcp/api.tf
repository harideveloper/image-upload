# # Enable required APIs (if not already enabled in another file)
# resource "google_project_service" "cloud_apis" {
#   for_each = toset([
#     "cloudfunctions.googleapis.com",
#     "cloudbuild.googleapis.com",
#     "storage.googleapis.com"
#   ])
#   project = var.project_id
#   service = each.key
# }

