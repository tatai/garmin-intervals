import csv
import io
import json
import os

from flask import Flask, request, jsonify, send_file, render_template
from werkzeug.utils import secure_filename

from csv_processor import process_csv, ColumnNotFoundError, InvalidCSVError

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024


def load_translations():
    translations = {}
    i18n_dir = os.path.join('static', 'i18n')

    for filename in os.listdir(i18n_dir):
        if filename.endswith('.json'):
            # Remove .json extension
            lang_code = filename[:-5]
            filepath = os.path.join(i18n_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                translations[lang_code] = json.load(f)

    return translations


TRANSLATIONS = load_translations()


@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response


@app.route('/')
@app.route('/<lang>')
def index(lang='en'):
    if lang not in ['en', 'es']:
        lang = 'en'

    translations = TRANSLATIONS[lang]

    translations_json = json.dumps(translations)

    return render_template('index.html', lang=lang, t=translations, t_json=translations_json)


@app.route('/api/process', methods=['POST'])
def process_file():
    """
    Process uploaded CSV file and return filtered data.

    Form data:
        file: CSV file
        columns: Comma-separated list of column names
        output_format: 'json' or 'csv'

    Returns:
        JSON array of filtered data or CSV file download
    """
    # Validate file upload
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be a CSV'}), 400

    # Get and validate columns parameter
    columns_str = request.form.get('columns', '')
    if not columns_str:
        return jsonify({'error': 'No columns specified'}), 400

    # Parse comma-separated columns
    columns = [col.strip() for col in columns_str.split(',') if col.strip()]
    if not columns:
        return jsonify({'error': 'No valid columns specified'}), 400

    # Get output format
    output_format = request.form.get('output_format', 'json')
    if output_format not in ['json', 'csv']:
        return jsonify({'error': 'Invalid output format'}), 400

    try:
        # Read file content
        file_stream = io.BytesIO(file.read())

        # Process CSV
        filtered_data = process_csv(file_stream, columns)

        # Return based on output format
        if output_format == 'json':
            return jsonify({
                'success': True,
                'data': filtered_data,
                'count': len(filtered_data)
            })
        else:  # csv
            # Create CSV in memory
            output = io.StringIO()
            if filtered_data:
                writer = csv.DictWriter(output, fieldnames=columns)
                writer.writeheader()
                writer.writerows(filtered_data)

            # Convert to bytes for download
            output.seek(0)
            bytes_output = io.BytesIO(output.getvalue().encode('utf-8'))
            bytes_output.seek(0)

            # Generate download filename
            original_filename = secure_filename(file.filename)
            download_filename = f"intervals_{original_filename}"

            return send_file(
                bytes_output,
                mimetype='text/csv',
                as_attachment=True,
                download_name=download_filename
            )

    except ColumnNotFoundError as e:
        return jsonify({
            'error': 'Columns not found in CSV',
            'missing': e.missing_columns
        }), 400
    except InvalidCSVError as e:
        return jsonify({
            'error': 'Invalid CSV file',
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'error': 'Error processing file',
            'message': str(e)
        }), 500


@app.errorhandler(413)
def file_too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 1MB'}), 413


if __name__ == '__main__':
    app.run(debug=True)
