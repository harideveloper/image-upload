# Create a Cloud SQL instance (Private Only)
resource "google_sql_database_instance" "postgres_instance" {
  name             = "${var.application}-instance"
  database_version = "POSTGRES_14"
  region           = var.region

  settings {
    tier = "db-f1-micro" # Change as per your needs

    ip_configuration {
      ipv4_enabled = false  # ❌ Disabling Public IP
      private_network = google_compute_network.vpc.id  # ✅ Using Private IP
    }
  }

  depends_on = [
    google_project_service.apis,
    google_compute_network.vpc
  ]
}

# Create a PostgreSQL database
resource "google_sql_database" "database" {
  name     = "${var.application}-db"
  instance = google_sql_database_instance.postgres_instance.name

  depends_on = [
    google_sql_database_instance.postgres_instance
  ]
}

# Create a database user
resource "google_sql_user" "db_user" {
  name     = "dbadmin"
  instance = google_sql_database_instance.postgres_instance.name
  password = "password123" # ⚠️ Use Secret Manager instead of hardcoding

  depends_on = [
    google_sql_database_instance.postgres_instance
  ]
}

# Output database connection details
output "db_instance_connection_name" {
  value = google_sql_database_instance.postgres_instance.connection_name

  depends_on = [
    google_sql_database_instance.postgres_instance
  ]
}

output "db_user" {
  value = google_sql_user.db_user.name
}

output "db_password" {
  value     = google_sql_user.db_user.password
  sensitive = true
}
