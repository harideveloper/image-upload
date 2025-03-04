# Create a VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${var.application}-vpc"
  auto_create_subnetworks = false

  depends_on = [
    google_project_service.apis
  ]
}

# Create a Private Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.application}-subnet"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.10.0.0/24"
  private_ip_google_access = true

  depends_on = [
    google_compute_network.vpc,
  ]
}

# Reserve a Private IP Range for Private Service Access (Required)
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.application}-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 24  # Must match the range (10.10.0.0/24)
  network       = google_compute_network.vpc.id

  depends_on = [
    google_project_service.apis,
    google_compute_network.vpc
  ]
}

# Private Service Access for Cloud SQL (After reserving the range)
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [
    google_project_service.apis,
    google_compute_network.vpc,
    google_compute_global_address.private_ip_range
  ]
}


resource "google_vpc_access_connector" "connector" {
  name          = "connector"
  network       = google_compute_network.vpc.id
  region        = var.region
  ip_cidr_range = "10.100.0.0/28"
  min_instances = 2
  max_instances = 3

  depends_on = [
    google_compute_network.vpc,
    google_project_service.apis
  ]
}

