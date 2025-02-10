
# resource "google_cloud_run_v2_service" "iap_auth_test" {
#   name     = "iap-auth-test"
#   location = var.region
#   ingress = "INGRESS_TRAFFIC_ALL"

#   template {
#     containers {
#       image = var.iap_auth_image
#       env {
#         name  = "AUDIENCE"
#         value = var.audience
#       }
#     }
#   }
# }

# resource "google_cloud_run_v2_service_iam_member" "iap_unauthenticated_access" {
#   project = google_cloud_run_v2_service.iap_auth_test.project
#   location = google_cloud_run_v2_service.iap_auth_test.location
#   name = google_cloud_run_v2_service.iap_auth_test.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }


# # IAP 
# resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
#   project = google_cloud_run_v2_service.iap_auth_test.project
#   location = google_cloud_run_v2_service.iap_auth_test.location
#   name = google_cloud_run_v2_service.iap_auth_test.name
#   role     = "roles/run.invoker"
#   member   = "serviceAccount:service-${var.project_number}@gcp-sa-iap.iam.gserviceaccount.com"
# }

