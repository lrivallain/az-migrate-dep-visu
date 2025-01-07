resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_container_app_environment" "az_migrate_dep_visu" {
  name                       = "az-migrate-dep-visu-env"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
}

resource "azurerm_container_app" "az_migrate_dep_visu" {
  name                         = "az-migrate-dep-visu-app"
  container_app_environment_id = azurerm_container_app_environment.az_migrate_dep_visu.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "webapp"
      image  = "docker.io/lrivallain/az-migrate-dep-visu:latest"
      cpu    = 0.25
      memory = "0.5Gi"
      env {
        name  = "FLASK_DEBUG"
        value = "false" # disable Flask debug mode
      }
      env {
        name  = "FLASK_BIND_ALL"
        value = "true" # force to bind 0.0.0.0 due to Azure App Service limitation
      }
    }
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 5000
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
}