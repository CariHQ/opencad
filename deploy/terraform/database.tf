resource "google_sql_database_instance" "opencad" {
  name             = "opencad-db"
  database_version = "POSTGRES_16"
  region           = var.region
  project          = var.project

  settings {
    tier              = "db-g1-small"
    availability_type = "ZONAL"
    disk_autoresize   = true
    disk_size         = 10
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = false
      start_time                     = "03:00"
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled = true
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }
  }

  deletion_protection = true

  depends_on = [google_project_service.apis["sqladmin.googleapis.com"]]
}

resource "google_sql_database" "opencad" {
  name     = "opencad"
  instance = google_sql_database_instance.opencad.name
  project  = var.project
}
