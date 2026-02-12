# Garmin CSV Filter

A  web application to filter and extract specific columns from Garmin Connect training data CSV files.

## Features

- 🌐 **Bilingual Interface**: Toggle between English and Spanish
- 📤 **File Upload**: Upload CSV files from Garmin Connect (max 1MB)
- 🎯 **Column Selection**: Choose which columns to extract via comma-separated input
- 👀 **View Results**: Display filtered data in a responsive table
- 💾 **Download CSV**: Export filtered data as a CSV file
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Backend**: Flask 3.x (Python) with Jinja2 templates
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **UI Framework**: Material Design principles with custom CSS
- **Package Manager**: uv

## Setup

### Prerequisites

- Python 3.10 or higher
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd garmin
```

2. Install dependencies using uv:
```bash
uv sync
```

### Running the Application

#### Development Mode (with auto-reload):
```bash
uv run flask --app app run --debug --port 5001
```

#### Production Mode (with Gunicorn):
```bash
uv run gunicorn --config gunicorn.conf.py app:app
```

The application will be available at `http://localhost:5001`

## Project Structure

```
garmin/
├── app.py                  # Flask application with API endpoints
├── csv_processor.py        # CSV processing logic
├── pyproject.toml          # Project configuration and dependencies
├── templates/
│   └── index.html         # Jinja2 template (server-side rendering)
├── static/
│   ├── styles.css         # Application styles (Material Design)
│   ├── app.js             # Frontend JavaScript logic
│   └── i18n/              # Internationalization files
│       ├── en.json        # English translations
│       └── es.json        # Spanish translations
└── README.md              # This file
```

## API Endpoints

### GET `/` or `GET /<lang>`
Serves the main HTML page with server-side rendered translations.

**Parameters:**
- `lang` (optional): Language code (`en` or `es`). Defaults to `en`.

**Examples:**
- `/` - English version
- `/en` - English version
- `/es` - Spanish version

### POST `/api/process`
```json
{
  "en": {
    "pageTitle": "Garmin CSV Filter",
    ...
  }
}
```

### POST `/api/process`
Processes the uploaded CSV file and returns filtered data.

**Form Data:**
- `file`: CSV file (required, max 1MB)
- `columns`: Comma-separated column names (required)
- `output_format`: `json` or `csv` (required)

**JSON Response (output_format=json):**
```json
{
  "success": true,
  "data": [
    {
      "Intervalo": "1",
      "Tiempo": "5:00",
      ...
    }
  ],
  "count": 10
}
```

**CSV Download (output_format=csv):**
Returns a CSV file with the filtered data.

**Error Response:**
```json
{
  "error": "Error description",
  "missing": ["Column1", "Column2"]  // Only for missing columns error
}
```

## Usage

1. Open the application in your browser
2. Click "Choose File" to select your Garmin Connect CSV file
3. Enter or modify the comma-separated column names you want to extract
4. Click "View Results" to see the filtered data in a table, or "Download CSV" to save it as a file

## Data Processing Rules

The application automatically:
- Filters out summary rows where "Tipo de paso" is "Resumen" or "--"
- Removes empty columns from the CSV
- Validates that all requested columns exist in the uploaded file
- Supports UTF-8 and Latin-1 encodings for CSV files

## Error Handling

The application provides user-friendly error messages for:
- File not selected
- File too large (>1MB)
- Invalid file format (non-CSV)
- Missing column names
- Columns not found in CSV
- Invalid CSV structure
- Network errors

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.








