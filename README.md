[![Python application](https://github.com/lrivallain/az-migrate-dep-visu/actions/workflows/main.yml/badge.svg)](https://github.com/lrivallain/az-migrate-dep-visu/actions/workflows/main.yml)

# Network Flows Visualization

This project is a web application that processes and visualizes network flow data from CSV files exported from
Azure Migrate Dependency analysis. The goal is to provide a user-friendly interface for analyzing network flows,
filter the content and prepare migration plans.

## Features

- **CSV Upload**: Upload CSV files containing network flow data from Azure Migrate Dependency analysis.
- **Data Processing**: Extract and process data from the uploaded CSV files.
- **Visualization**: Visualize the network flows using interactive graphs.
- **Filtering**: Filter the data based on various criteria such as IP addresses, ports, and VLANs.
- **CSV Download**: Download the filtered data as a CSV file.
- **VLANs**: Support for optional VLANs data columns in the CSV file and flow grouping.
- **Non RFC1918 IPs**: Regroup and filter non-RFC1918 IP addresses.

## How to Use

1. **Upload CSV File**:
   - Navigate to the upload page.
   - Upload a CSV file containing network flow data.
   - The CSV file should have the following columns:
     - `Source server name`
     - `Source IP`
     - `Source application`
     - `Source process`
     - `Destination server name`
     - `Destination IP`
     - `Destination application`
     - `Destination process`
     - `Destination port`
     - `Source VLAN` (optional)
     - `Destination VLAN` (optional)

2. **View and Filter Data**:
   - After uploading, you will be redirected to the visualization page.
   - Use the filters to narrow down the data based on source IP, destination IP, port, and VLANs.
   - The data will be displayed in a table and as an interactive graph.

4. **Graph Interaction**:
   - Click on a connection to get some information about the flow statistics.

5. **Filter and group Non-RFC1918 IPs**:
   - Use the "Group Non-RFC1918" button to group non-RFC1918 IP addresses.
   - Table will be updated to simplify the search and filtering.
   - This enables to focus on Internet-bound traffic.

3. **Download Filtered Data**:
   - Click the "Download CSV" button to download the filtered data as a CSV file.

### Optional VLANs data

To help with the filtering, you can add optional VLANs data columns to the CSV file.

The columns should be named `Source VLAN` and `Destination VLAN`.

> These columns are not part of the original CSV file exported from Azure Migrate Dependency analysis.

The application will use this data to help filter and grouping resources in the visualization.

## Running the Application

### From source

1. Install the required Python packages:

   ```bash
   pip install .
   python az_migrate_dep_visu/app.py
   ```

2. Open the application in a web browser: [http://localhost:5000](http://localhost:5000)

### Using Docker

1. Build the Docker image:

   ```bash
   docker build -t az-migrate-dep-visu .
   ```

2. Run the Docker container:

   ```bash
   docker run -p 5000:5000 az-migrate-dep-visu
   ```

3. Open the application in a web browser: [http://localhost:5000](http://localhost:5000)

## From PyPi

1. To install the package, use pip:

   ```bash
   pip install az-migrate-dep-visu
   ```

2. To run the application:

   ```bash
   az-mdv
   # `az-mdv` is a script alias to az_migrate_dep_visu.app
   ```

3. Open the application in a web browser: [http://localhost:5000](http://localhost:5000)

### From Terraform & Azure (Container App)

Please refer to the [Terraform deployment guide](Terraform/README.md) for instructions on how to deploy the application
on Azure using Terraform and Azure Container Apps.

## Configuration

The application can be configured using environment variables:

* `FLASK_BIND_ALL` (default: `false`): Set to `true` to bind the Flask application to all network interfaces (0.0.0.0).
* `FLASK_DEBUG` (default: `true`): Set to `true` to enable debug mode in Flask.

## Contributing

Contributions are welcome! If you have suggestions for improvements or find bugs, please open an issue or submit a pull
request.

### Running Tests

To run the tests, use the following command:

```bash
pytest
```

## Example

![Screenshot of the application with a filtered applied](docs/images/Example.png)