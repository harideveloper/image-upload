resource "google_artifact_registry_repository" "registry" {
  location      = var.region
  description   = "Google Artifact Registry ${var.application} for project ${var.project_id}"
  format        = "DOCKER"
  repository_id = var.application
  depends_on    = [google_project_service.apis]
}