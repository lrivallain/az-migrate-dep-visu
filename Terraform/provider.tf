provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  resource_providers_to_register = [
    "Microsoft.Containers",
    "Microsoft.Containerservice",
    "Microsoft.App"
  ]
}
