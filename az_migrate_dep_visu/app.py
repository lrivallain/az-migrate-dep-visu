import csv
import random
from flask import Flask, request, render_template, redirect, url_for
from jinja2 import Template
import json
from werkzeug.datastructures import FileStorage
import os

app = Flask(__name__)

def read_csv(file: FileStorage) -> list:
    """
    Reads a CSV file and returns a list of dictionaries representing the data.

    Parameters:
    file (FileStorage): The uploaded CSV file.

    Returns:
    list: A list of dictionaries containing the CSV data.
    """
    in_data = []
    file = file.stream.read().decode("utf-8").splitlines()
    flowreader = csv.DictReader(file, delimiter=',')
    for row in flowreader:
        in_data.append({
            'source_server_name': row["Source server name"],
            'source': row["Source IP"],
            'source_application': row["Source application"],
            'source_process': row["Source process"],
            'destination_server_name': row["Destination server name"],
            'target': row["Destination IP"],
            'destination_application': row["Destination application"],
            'destination_process': row["Destination process"],
            'port': row["Destination port"],
            'source_vlan': row.get("Source VLAN", ""),
            'destination_vlan': row.get("Destination VLAN", "")
        })
    return in_data

def extract_unique_values(in_data: list) -> tuple:
    """
    Extracts unique values from the input data.

    Parameters:
    in_data (list): A list of dictionaries containing the CSV data.

    Returns:
    tuple: A tuple containing lists of unique source IPs, destination IPs, ports, source VLANs, and destination VLANs.
    """
    unique_source_ips = sorted(set(entry['source'] for entry in in_data))
    unique_destination_ips = sorted(set(entry['target'] for entry in in_data))
    unique_ports = sorted(set(int(entry['port']) for entry in in_data if entry['port'].isdigit()))
    unique_source_vlans = sorted(set(int(entry['source_vlan']) for entry in in_data if entry['source_vlan'].isdigit()))
    unique_destination_vlans = sorted(set(int(entry['destination_vlan']) for entry in in_data if entry['destination_vlan'].isdigit()))
    return unique_source_ips, unique_destination_ips, unique_ports, unique_source_vlans, unique_destination_vlans

def count_occurrences(in_data: list) -> dict:
    """
    Counts occurrences of each unique set of data.

    Parameters:
    in_data (list): A list of dictionaries containing the CSV data.

    Returns:
    dict: A dictionary with keys as unique sets of data and values as their counts.
    """
    occurrences = {}
    for entry in in_data:
        key = (entry['source_server_name'], entry['source'], entry['source_application'], entry['source_process'],
               entry['destination_server_name'], entry['target'], entry['destination_application'], entry['destination_process'],
               entry['port'], entry['source_vlan'], entry['destination_vlan'])
        if key in occurrences:
            occurrences[key] += 1
        else:
            occurrences[key] = 1
    return occurrences

def create_unique_data(occurrences: dict) -> list:
    """
    Creates a list of unique data sets with their counts.

    Parameters:
    occurrences (dict): A dictionary with keys as unique sets of data and values as their counts.

    Returns:
    list: A sorted list of dictionaries containing unique data sets and their counts.
    """
    unique_data = []
    for key, count in occurrences.items():
        unique_data.append({
            'source_server_name': key[0],
            'source': key[1],
            'source_application': key[2],
            'source_process': key[3],
            'destination_server_name': key[4],
            'target': key[5],
            'destination_application': key[6],
            'destination_process': key[7],
            'port': key[8],
            'source_vlan': key[9],
            'destination_vlan': key[10],
            'count': count
        })
    return sorted(unique_data, key=lambda x: x['count'], reverse=True)

def is_rfc1918(ip: str) -> bool:
    """
    Checks if an IP address is part of the RFC1918 private address space.

    Parameters:
    ip (str): The IP address to check.

    Returns:
    bool: True if the IP address is part of the RFC1918 private address space, False otherwise.
    """
    parts = ip.split('.')
    if len(parts) != 4:
        return False
    first, second = int(parts[0]), int(parts[1])
    if first == 10:
        return True
    if first == 172 and 16 <= second <= 31:
        return True
    if first == 192 and second == 168:
        return True
    return False

def generate_node_colors(unique_data: list) -> dict:
    """
    Generates random colors for nodes and sets non-RFC1918 nodes to a specific color.

    Parameters:
    unique_data (list): A list of dictionaries containing unique data sets.

    Returns:
    dict: A dictionary with IP addresses as keys and their corresponding colors as values.
    """
    node_colors = {}
    non_rfc1918_color = "#696969"
    for entry in unique_data:
        if entry['source'] not in node_colors:
            if is_rfc1918(entry['source']):
                node_colors[entry['source']] = "#{:06x}".format(random.randint(0, 0xFFFFFF))
            else:
                node_colors[entry['source']] = non_rfc1918_color
        if entry['target'] not in node_colors:
            if is_rfc1918(entry['target']):
                node_colors[entry['target']] = "#{:06x}".format(random.randint(0, 0xFFFFFF))
            else:
                node_colors[entry['target']] = non_rfc1918_color
    return node_colors

def process_data(file: FileStorage) -> dict:
    """
    Processes the uploaded CSV file and extracts necessary data for visualization.

    Parameters:
    file (FileStorage): The uploaded CSV file.

    Returns:
    dict: A dictionary containing unique source IPs, destination IPs, ports, source VLANs, destination VLANs, sorted unique data, and node colors.
    """
    in_data = read_csv(file)
    unique_source_ips, unique_destination_ips, unique_ports, unique_source_vlans, unique_destination_vlans = extract_unique_values(in_data)
    occurrences = count_occurrences(in_data)
    unique_data_sorted = create_unique_data(occurrences)
    node_colors = generate_node_colors(unique_data_sorted)
    return {
        'unique_source_ips': unique_source_ips,
        'unique_destination_ips': unique_destination_ips,
        'unique_ports': [str(port) for port in unique_ports],
        'unique_source_vlans': [str(vlan) for vlan in unique_source_vlans],
        'unique_destination_vlans': [str(vlan) for vlan in unique_destination_vlans],
        'unique_data_sorted': unique_data_sorted,
        'node_colors': node_colors
    }

@app.route('/')
def upload_file():
    """
    Renders the upload file page.

    Returns:
    str: The rendered HTML template for the upload file page.
    """
    error = request.args.get('error')
    return render_template('upload.html', error=error)

@app.route('/flows', methods=['POST'])
def uploader_file():
    """
    Handles the file upload and processes the CSV file.

    Returns:
    str: The rendered HTML template for the result page with the processed data.
    """
    if 'file' not in request.files:
        return redirect(url_for('upload_file', error="No file part in the request"))
    file = request.files['file']
    if file.filename == '':
        return redirect(url_for('upload_file', error="No selected file"))
    if file:
        data = process_data(file)
        return render_template('result.html', file_name=file.filename, **data)

if __name__ == '__main__':
    # Configure debug mode based on environment variable FLASK_DEBUG
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 't']
    # Configure bind address based on environment variable FLASK_BIND_ALL
    bind_address = '0.0.0.0' if os.getenv('FLASK_BIND_ALL', 'False').lower() in ['true', '1', 't'] else '127.0.0.1'
    # Run the Flask app
    app.run(debug=debug_mode, host=bind_address)
