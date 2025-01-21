# Enable required APIs (if not already enabled in another file)
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "cloudfunctions.googleapis.com",    
    "storage.googleapis.com",           
    "logging.googleapis.com",           
    "monitoring.googleapis.com",        
    "iam.googleapis.com",
    # "iap.googleapis.com", 
  ])
  project = var.project_id
  service = each.key
}