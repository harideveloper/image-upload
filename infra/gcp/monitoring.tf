resource "google_monitoring_dashboard" "file_accessor_dashboard" {
  dashboard_json = <<EOF
{
  "displayName": "File Scan Monitoring Dashboard",
  "gridLayout": {
    "columns": 3
  },
  "widgets": [
    {
      "title": "File Uploads in Landing Bucket",
      "xyChart": {
        "dataSets": [
          {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gcs_bucket\" AND logName=\"projects/your-project-id/logs/file-access-logs\" AND jsonPayload.eventType=\"generate_signed_url\"",
                "comparison": "COMPARISON_GT",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            }
          }
        ],
        "minAlignmentPeriod": "60s"
      }
    },
    {
      "title": "DLP Events Detected",
      "xyChart": {
        "dataSets": [
          {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gcs_bucket\" AND logName=\"projects/your-project-id/logs/file-access-logs\" AND jsonPayload.eventType=\"sensitive_data_found\"",
                "comparison": "COMPARISON_GT",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            }
          }
        ],
        "minAlignmentPeriod": "60s"
      }
    },
    {
      "title": "Quarantined Files",
      "xyChart": {
        "dataSets": [
          {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gcs_bucket\" AND logName=\"projects/your-project-id/logs/file-access-logs\" AND jsonPayload.eventType=\"move_file\" AND jsonPayload.destinationBucket=\"${google_storage_bucket.quarantine.name}\"",
                "comparison": "COMPARISON_GT",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            }
          }
        ],
        "minAlignmentPeriod": "60s"
      }
    },
    {
      "title": "Clean Files",
      "xyChart": {
        "dataSets": [
          {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"gcs_bucket\" AND logName=\"projects/your-project-id/logs/file-access-logs\" AND jsonPayload.eventType=\"move_file\" AND jsonPayload.destinationBucket=\"${google_storage_bucket.clean.name}\"",
                "comparison": "COMPARISON_GT",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_RATE"
                }
              }
            }
          }
        ],
        "minAlignmentPeriod": "60s"
      }
    }
  ]
}
EOF
}
