import csv
import random
from flask import Flask, request, render_template, redirect, url_for
from jinja2 import Template
import json

app = Flask(__name__)

def process_data(file):
    in_data = []
    # Open the file in text mode
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

    # Extract unique VLANs
    unique_source_vlans = sorted(set(entry['source_vlan'] for entry in in_data if entry['source_vlan']))
    unique_destination_vlans = sorted(set(entry['destination_vlan'] for entry in in_data if entry['destination_vlan']))

    # Extract unique IPs
    unique_source_ips = sorted(set(entry['source'] for entry in in_data))
    unique_destination_ips = sorted(set(entry['target'] for entry in in_data))

    # Count occurrences of each unique set
    occurrences = {}
    for entry in in_data:
        key = (entry['source_server_name'], entry['source'], entry['source_application'], entry['source_process'],
               entry['destination_server_name'], entry['target'], entry['destination_application'], entry['destination_process'],
               entry['port'], entry['source_vlan'], entry['destination_vlan'])
        if key in occurrences:
            occurrences[key] += 1
        else:
            occurrences[key] = 1

    # Create a new list with unique sets and their counts
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

    # Sort unique_data by count in descending order
    unique_data_sorted = sorted(unique_data, key=lambda x: x['count'], reverse=True)

    # Extract unique values for dropdowns and sort them
    unique_source_ips = sorted(set(entry['source'] for entry in unique_data))
    unique_destination_ips = sorted(set(entry['target'] for entry in unique_data))
    unique_ports = sorted(set(int(entry['port']) for entry in unique_data if entry['port'].isdigit()))  # Sort ports numerically
    unique_source_vlans = sorted(set(int(entry['source_vlan']) for entry in unique_data if entry['source_vlan'].isdigit()))  # Sort source VLANs numerically
    unique_destination_vlans = sorted(set(int(entry['destination_vlan']) for entry in unique_data if entry['destination_vlan'].isdigit()))  # Sort destination VLANs numerically

    # Convert numeric values back to strings for rendering
    unique_ports = [str(port) for port in unique_ports]
    unique_source_vlans = [str(vlan) for vlan in unique_source_vlans]
    unique_destination_vlans = [str(vlan) for vlan in unique_destination_vlans]

    # Function to check if an IP is part of RFC1918
    def is_rfc1918(ip):
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

    # Generate random colors for nodes and set non-RFC1918 nodes to blue
    node_colors = {}
    non_rfc1918_color = "#696969"  # Color for non-RFC1918 nodes
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

    return {
        'unique_source_ips': unique_source_ips,
        'unique_destination_ips': unique_destination_ips,
        'unique_ports': unique_ports,
        'unique_source_vlans': unique_source_vlans,
        'unique_destination_vlans': unique_destination_vlans,
        'unique_data_sorted': unique_data_sorted,
        'node_colors': node_colors
    }

@app.route('/')
def upload_file():
    return render_template('upload.html')

@app.route('/flows', methods=['POST'])
def uploader_file():
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        return redirect(request.url)
    if file:
        data = process_data(file)
        return render_template('result.html', file_name=file.filename, **data)

if __name__ == '__main__':
    app.run(debug=True)
