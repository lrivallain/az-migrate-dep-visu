import csv
import random
from flask import Flask, request, render_template, redirect, url_for
from jinja2 import Template
import json
from werkzeug.datastructures import FileStorage
import os

app = Flask(__name__)

def read_csv(file: FileStorage) -> str:
    """
    Reads a CSV file and returns its content as a string.

    Parameters:
    file (FileStorage): The uploaded CSV file.

    Returns:
    str: The content of the CSV file.
    """
    return file.stream.read().decode("utf-8")

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
        csv_data = read_csv(file)
        return render_template('result.html', file_name=file.filename, csv_data=csv_data)

if __name__ == '__main__':
    # Configure debug mode based on environment variable FLASK_DEBUG
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 't']
    # Configure bind address based on environment variable FLASK_BIND_ALL
    bind_address = '0.0.0.0' if os.getenv('FLASK_BIND_ALL', 'False').lower() in ['true', '1', 't'] else '127.0.0.1'
    # Run the Flask app
    app.run(debug=debug_mode, host=bind_address)
