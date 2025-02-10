resource "google_monitoring_dashboard" "dashboard" {
  dashboard_json = file("${path.module}/dashboard/dashboard.json")
}
