provider "google" {
  project = "rag-accelerator-dev-e694" 
  region  = "europe-west2"       
}

resource "google_storage_bucket" "file_upload_ui" {
  name                        = "file_upload_ui"
  location                    = "EU"                    
  force_destroy               = true                   
  uniform_bucket_level_access = true                    

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }

  website {
    main_page_suffix = "home.html"
    not_found_page   = "error.html"
  }
}

resource "google_storage_bucket_object" "home_page" {
  name   = "home.html"
  bucket = google_storage_bucket.file_upload_ui.name
  source = "home.html" 
  content_type = "text/html"
}

resource "google_storage_bucket_object" "error_page" {
  name   = "error.html"
  bucket = google_storage_bucket.file_upload_ui.name
  source = "error.html" 
  content_type = "text/html"
}

output "storage_url" {
  value = "http://${google_storage_bucket.file_upload_ui.name}.storage.googleapis.com/home.html"
}
