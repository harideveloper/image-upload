## Storage 
resource "google_storage_bucket" "landing" {
  name                        = "${var.project_id}-landing"
  location                    = var.region
  force_destroy               = true
  storage_class               = "REGIONAL"
  uniform_bucket_level_access = true
  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin", "x-goog-meta-user-id", "x-goog-meta-correlation-id"]
    max_age_seconds = 3600
  }
}


resource "google_storage_bucket" "clean" {
  name                        = "${var.project_id}-clean"
  storage_class               = "REGIONAL"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "OPTIONS"]
    response_header = ["Content-Type", "Access-Control-Allow-Origin"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "quarantine" {
  name                        = "${var.project_id}-quarantine"
  storage_class               = "REGIONAL"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "webportal" {
  name                        = "${var.project_id}-web-portal"
  storage_class               = "REGIONAL"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
  website {
    main_page_suffix = "home.html"
    not_found_page   = "error.html"
  }
}

# resource "google_storage_bucket_object" "static_files" {
#   for_each     = var.static_files
#   name         = each.key
#   bucket       = google_storage_bucket.webportal.name
#   source       = each.value.source
#   content_type = each.value.content_type

#     depends_on = [ google_storage_bucket.webportal ]
# }

resource "google_storage_bucket_object" "homepage" {
  name         = "home.html"
  bucket       = google_storage_bucket.webportal.name
  source       = "../../app/ui/home.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "errorpage" {
  name         = "error.html"
  bucket       = google_storage_bucket.webportal.name
  source       = "../../app/ui/error.html"
  content_type = "text/html"
}

