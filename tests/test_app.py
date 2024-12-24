import pytest
from flask import Flask
from werkzeug.datastructures import FileStorage
from io import BytesIO
from urllib.parse import unquote
from app import app, read_csv, extract_unique_values, count_occurrences, create_unique_data, is_rfc1918, generate_node_colors, process_data

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_file(client):
    """Test the upload file page."""
    rv = client.get('/')
    assert rv.status_code == 200
    assert b'Upload CSV File' in rv.data

def test_uploader_file_no_file(client):
    """Test the uploader file route with no file."""
    rv = client.post('/flows', data={})
    assert rv.status_code == 302
    location = rv.headers['Location']
    assert 'No+file+part+in+the+request' in unquote(location)

def test_uploader_file_empty_file(client):
    """Test the uploader file route with an empty file."""
    data = {
        'file': (BytesIO(b''), '')
    }
    rv = client.post('/flows', data=data, content_type='multipart/form-data')
    assert rv.status_code == 302
    location = rv.headers['Location']
    assert 'No+selected+file' in unquote(location)

def test_read_csv():
    """Test the read_csv function."""
    file_content = b"Source server name,Source IP,Source application,Source process,Destination server name,Destination IP,Destination application,Destination process,Destination port,Source VLAN,Destination VLAN\n"
    file_content += b"server1,192.168.1.1,app1,proc1,server2,192.168.1.2,app2,proc2,80,1,2\n"
    file = FileStorage(stream=BytesIO(file_content), filename="test.csv", content_type="text/csv")
    data = read_csv(file)
    assert len(data) == 1
    assert data[0]['source'] == '192.168.1.1'

def test_extract_unique_values():
    """Test the extract_unique_values function."""
    in_data = [
        {'source': '192.168.1.1', 'target': '192.168.1.2', 'port': '80', 'source_vlan': '1', 'destination_vlan': '2'},
        {'source': '192.168.1.3', 'target': '192.168.1.4', 'port': '443', 'source_vlan': '3', 'destination_vlan': '4'}
    ]
    unique_source_ips, unique_destination_ips, unique_ports, unique_source_vlans, unique_destination_vlans = extract_unique_values(in_data)
    assert unique_source_ips == ['192.168.1.1', '192.168.1.3']
    assert unique_destination_ips == ['192.168.1.2', '192.168.1.4']
    assert unique_ports == [80, 443]
    assert unique_source_vlans == [1, 3]
    assert unique_destination_vlans == [2, 4]

def test_count_occurrences():
    """Test the count_occurrences function."""
    in_data = [
        {'source_server_name': 'server1', 'source': '192.168.1.1', 'source_application': 'app1', 'source_process': 'proc1',
         'destination_server_name': 'server2', 'target': '192.168.1.2', 'destination_application': 'app2', 'destination_process': 'proc2',
         'port': '80', 'source_vlan': '1', 'destination_vlan': '2'},
        {'source_server_name': 'server1', 'source': '192.168.1.1', 'source_application': 'app1', 'source_process': 'proc1',
         'destination_server_name': 'server2', 'target': '192.168.1.2', 'destination_application': 'app2', 'destination_process': 'proc2',
         'port': '80', 'source_vlan': '1', 'destination_vlan': '2'}
    ]
    occurrences = count_occurrences(in_data)
    assert len(occurrences) == 1
    assert occurrences[('server1', '192.168.1.1', 'app1', 'proc1', 'server2', '192.168.1.2', 'app2', 'proc2', '80', '1', '2')] == 2

def test_create_unique_data():
    """Test the create_unique_data function."""
    occurrences = {
        ('server1', '192.168.1.1', 'app1', 'proc1', 'server2', '192.168.1.2', 'app2', 'proc2', '80', '1', '2'): 2
    }
    unique_data = create_unique_data(occurrences)
    assert len(unique_data) == 1
    assert unique_data[0]['count'] == 2

def test_is_rfc1918():
    """Test the is_rfc1918 function."""
    assert is_rfc1918('192.168.1.1') is True
    assert is_rfc1918('172.16.0.1') is True
    assert is_rfc1918('10.0.0.1') is True
    assert is_rfc1918('8.8.8.8') is False

def test_generate_node_colors():
    """Test the generate_node_colors function."""
    unique_data = [
        {'source': '192.168.1.1', 'target': '192.168.1.2'},
        {'source': '8.8.8.8', 'target': '8.8.4.4'}
    ]
    node_colors = generate_node_colors(unique_data)
    assert node_colors['192.168.1.1'] != "#696969"
    assert node_colors['8.8.8.8'] == "#696969"

def test_process_data():
    """Test the process_data function."""
    file_content = b"Source server name,Source IP,Source application,Source process,Destination server name,Destination IP,Destination application,Destination process,Destination port,Source VLAN,Destination VLAN\n"
    file_content += b"server1,192.168.1.1,app1,proc1,server2,192.168.1.2,app2,proc2,80,1,2\n"
    file = FileStorage(stream=BytesIO(file_content), filename="test.csv", content_type="text/csv")
    data = process_data(file)
    assert 'unique_source_ips' in data
    assert 'unique_destination_ips' in data
    assert 'unique_ports' in data
    assert 'unique_source_vlans' in data
    assert 'unique_destination_vlans' in data
    assert 'unique_data_sorted' in data
    assert 'node_colors' in data
