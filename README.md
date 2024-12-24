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

3. **Download Filtered Data**:
   - Click the "Download CSV" button to download the filtered data as a CSV file.

## Running the Application

### From command line

1. Install the required Python packages:

   ```bash
   pip install -r requirements.txt
   python app.py
   ```

2. Open the application in a web browser: [http://localhost:5000](http://localhost:5000)

### Using Docker

1. Build the Docker image:

   ```bash
   docker build -t network-flows-visualization .
   docker run -p 5000:5000 network-flows-visualization
   ```

2. Open the application in a web browser: [http://localhost:5000](http://localhost:5000)
