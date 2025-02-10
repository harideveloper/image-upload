resource "google_logging_metric" "file_upload_requests" {
  name        = "file_upload_requests"
  description = "Count of file upload requests"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-accessor"
resource.labels.location="${var.region}"
textPayload=~"eventType: file_upload_requested"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "file_upload_failure" {
  name        = "file_upload_requests_failures"
  description = "Count of file upload failures"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-accessor"
resource.labels.location="${var.region}"
textPayload=~"eventType: file_upload_failure"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "file_download_requests" {
  name        = "file_download_requests"
  description = "Count of file download requests"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-accessor"
resource.labels.location="${var.region}"
textPayload=~"eventType: file_download_requested"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "file_download_failure" {
  name        = "file_download_requests_failures"
  description = "Count of file downloand failures"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-accessor"
resource.labels.location="${var.region}"
textPayload=~"eventType: file_download_failure"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "invalid_requests" {
  name        = "invalid_requests"
  description = "Count of invalid requests"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-accessor"
resource.labels.location="${var.region}"
textPayload=~"eventType: invalid_request"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "files_processed" {
  name        = "files_processed"
  description = "Count of files processed by file-scanner"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-scanner"
resource.labels.location="${var.region}"
textPayload=~"eventType: file_scan_event"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "clean_files" {
  name        = "clean_files"
  description = "Count of files marked as clean after scanning"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-scanner"
resource.labels.location="${var.region}"
textPayload=~"eventType: sensitive_data_free"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "quarantined_files" {
  name        = "quarantined_files"
  description = "Count of files that were quarantined"
  filter      = <<EOT
resource.type="cloud_run_revision"
resource.labels.service_name="file-scanner"
resource.labels.location="${var.region}"
textPayload=~"eventType: sensitive_data_detected"
severity>=DEFAULT
EOT
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}
