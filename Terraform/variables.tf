variable "subscription_id" {
  description = "The Azure subscription ID to deploy resources"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
  default     = "app-dep-visu-rg"
}

variable "location" {
  description = "The Azure region to deploy resources"
  type        = string
  default     = "North Europe"
}
