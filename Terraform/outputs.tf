output "az_migrate_dep_visu_url" {
  description = "URL of the deployed App"
  value = "http://${azurerm_container_app.az_migrate_dep_visu.latest_revision_fqdn}"
}
