# dlp job topic
resource "google_pubsub_topic" "dlp_scan" {
  name = "file-accessor-dlp-scan"

  labels = {
    app = var.application
  }

  message_retention_duration = "600s"
}

# dlp job subscription
resource "google_pubsub_subscription" "dlp_scan_subscription" {
  name  = "file-accessor-dlp-scan"
  topic = google_pubsub_topic.dlp_scan.name

  labels = {
    app = var.application
  }

  message_retention_duration = "600s"
  retain_acked_messages      = true

  retry_policy {
    minimum_backoff = "10s"
  }

  enable_message_ordering = false
  depends_on              = [google_pubsub_topic.dlp_scan]
}
