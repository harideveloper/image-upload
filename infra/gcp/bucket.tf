## Storage 
resource "google_storage_bucket" "staging" {
  name                        = "${var.project_id}-staging"
  location                    = "EU"
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "webportal" {
  name                        = "${var.project_id}-webportal"
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

resource "google_storage_bucket_object" "homepage" {
  name         = "home.html"
  bucket       = google_storage_bucket.webportal.name
  source       = "../../app/ui/home-gcp-iap.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "errorpage" {
  name         = "error.html"
  bucket       = google_storage_bucket.webportal.name
  source       = "../../app/ui/error.html"
  content_type = "text/html"
}
