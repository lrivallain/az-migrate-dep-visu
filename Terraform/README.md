# App Dependency Visualization

Deploy the project with Terraform on Azure.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- An Azure account

## Deployment Steps

1. **Clone the repository:**

    ```sh
    git clone https://github.com/your-repo/app-dep-visu.git
    cd app-dep-visu
    ```

2. **Authenticate with Azure:**

    ```sh
    az login
    ```

4. **Configure Terraform:**

    Create a `terraform.tfvars` file with the following content:

    ```hcl
    subscription_id = "your-subscription-id"
    resource_group_name = "my-resource-group"
    location = "East US"
    ```

    Replace values with your Azure subscription ID, resource group name, and desired location.

3. **Initialize Terraform:**

    ```sh
    terraform init
    ```

4. **Apply the Terraform configuration:**

    ```sh
    terraform apply
    ```

5. **Access the deployed application:**

    After the deployment is complete, the URL of the deployed application will be displayed as an output.

    ```sh
    terraform output az_migrate_dep_visu_url
    ```

## Cleanup

To remove all resources created by Terraform, run:

```sh
terraform destroy
```