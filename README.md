# Garmin CSV Filter

A modern web application to filter and extract specific columns from Garmin Connect training data CSV files.

## ✨ Features

- 🌐 **Bilingual Interface**: Toggle between English and Spanish with server-side rendering
- 📤 **Drag & Drop**: Drag and drop CSV files or use traditional file picker
- ⚡ **Quick Presets**: Two predefined column configurations (Series/Training)
- 🎯 **Custom Column Selection**: Enter any comma-separated column names
- 👀 **Dual View**: Display results as HTML table or raw CSV text
- 📋 **Copy to Clipboard**: Copy CSV data with one click
- 💾 **Download CSV**: Export filtered data as a CSV file
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🎨 **Material Design**: Clean, modern interface with visual feedback

## 🔧 Technology Stack

- **Backend**: Flask 3.1.2 (Python) with Jinja2 templates
- **Production Server**: Gunicorn
- **Frontend**: HTML5, CSS3, jQuery 3.7.1
- **UI Framework**: Material Design principles with custom CSS
- **Package Manager**: uv
- **Deployment**: Docker ready with multi-stage build

## 🚀 Setup

### Prerequisites

- Python 3.10 or higher
- [uv](https://github.com/astral-sh/uv) package manager
- Docker (optional, for containerized deployment)

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

**Note:** Port 5000 may be in use by macOS AirPlay Receiver. Use port 5001 or disable AirPlay Receiver in System Settings.

## 📁 Project Structure

```
garmin/
├── app.py                    # Flask application with API endpoints
├── csv_processor.py          # CSV processing logic
├── gunicorn.conf.py          # Gunicorn production server configuration
├── pyproject.toml            # Project configuration and dependencies
├── Dockerfile                # Multi-stage Docker build
├── .dockerignore             # Docker build exclusions
├── templates/
│   └── index.html           # Jinja2 template (server-side rendering)
├── static/
│   ├── styles.css           # Application styles (Material Design)
│   ├── app.js               # Frontend jQuery logic
│   └── i18n/                # Internationalization
│       ├── en.json          # English translations
│       └── es.json          # Spanish translations
└── README.md                 # This file
```

## 🔌 API Endpoints

### GET `/` or `GET /<lang>`
Serves the main HTML page with server-side rendered translations.

**Parameters:**
- `lang` (optional): Language code (`en` or `es`). Defaults to `en`.

**Examples:**
- `/` - English version
- `/en` - English version (explicit)
- `/es` - Spanish version

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
      "Distancia": "1.00"
    }
  ],
  "count": 10
}
```

**CSV Download (output_format=csv):**
Returns a CSV file with the filtered data as an attachment.

**Error Response:**
```json
{
  "error": "Error description",
  "missing": ["Column1", "Column2"]  // Only for missing columns
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad request (validation error)
- `413`: File too large
- `500`: Server error

## 📖 Usage

### Basic Workflow

1. **Open the application** in your browser at `http://localhost:5001`
2. **Select language** (EN/ES) using the toggle button in the header
3. **Upload CSV file** using one of two methods:
   - **Drag & Drop**: Drag your CSV file into the blue drop zone
   - **Click to Browse**: Click the drop zone or "Choose File" button
4. **Select columns** using one of three methods:
   - **Series Preset**: Click "Series" for interval training data
   - **Training Preset**: Click "Training" for lap-based training data
   - **Custom**: Type comma-separated column names manually
5. **View or Download**:
   - **View Results**: See filtered data in an interactive table
   - **Download CSV**: Download filtered data as a CSV file

### Column Presets

#### Series (Interval Training)
```
Intervalo, Tipo de paso, Tiempo, Distancia, Ritmo medio, 
Frecuencia cardiaca media, Ascenso total, Descenso total
```

#### Training (Lap-based)
```
Vueltas, Tiempo, Tiempo acumulado, Distanciakm, Ritmo mediomin/km, 
Frecuencia cardiaca mediappm, Ascenso totalm, Descenso totalm
```

### Results View Options

After processing, you can switch between two views:

- **Table View**: Interactive HTML table with all data
- **CSV View**: Raw CSV text with copy-to-clipboard button

### Features in Detail

**Drag & Drop:**
- Visual feedback when dragging files
- Instant validation (file type and size)
- Shows selected file with option to remove

**Column Selection:**
- Pre-filled presets for common use cases
- Editable after selecting a preset
- Preserves column order as specified

**Results Display:**
- Maintains column order from input
- Shows row count
- Responsive table design
- Copy CSV with one click

## 🐳 Production Deployment

### Docker Deployment

The application is production-ready with Docker:

**Build:**
```bash
docker build -t garmin-csv-filter:latest .
```

**Run:**
```bash
docker run -d \
  --name garmin-csv-filter \
  -p 5001:5001 \
  --restart unless-stopped \
  garmin-csv-filter:latest
```

**Features:**
- Multi-stage build for smaller images (~150-200 MB)
- Non-root user for security
- Health checks every 30 seconds
- 5 Gunicorn workers for concurrency
- Optimized for use behind HAProxy or similar load balancers

### Gunicorn Configuration

Production server runs with:
- **Workers**: 5 (fixed, optimized for typical workload)
- **Worker Class**: sync (optimal for CPU-bound CSV processing)
- **Timeout**: 30 seconds
- **Port**: 5001 (bindable to all interfaces)

Configuration file: `gunicorn.conf.py`

## 📊 Data Processing Rules

The application automatically:
- Filters out summary rows where "Tipo de paso" is "Resumen" or "--"
- Removes empty columns from the CSV
- Validates that all requested columns exist in the uploaded file
- Supports UTF-8 and Latin-1 encodings for CSV files
- Maintains column order as specified by the user
- Properly escapes CSV values (quotes, commas, newlines)

## 🛡️ Security Features

- **File Size Limit**: 1MB maximum upload size
- **File Type Validation**: Only CSV files accepted
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Non-root User**: Docker container runs as `appuser` (UID 1000)
- **Input Validation**: All form inputs validated server-side
- **Error Handling**: Safe error messages without exposing internals

## 🌍 Internationalization (i18n)

The application supports multiple languages with server-side rendering:

**Available Languages:**
- English (en)
- Spanish (es)

**Features:**
- URL-based language selection (`/en`, `/es`)
- Server-side translation rendering (no FOUC)
- Easy to add new languages (just add `{lang}.json` file)
- Consistent translations across UI, errors, and success messages

**Adding a New Language:**
1. Create `static/i18n/{lang_code}.json`
2. Copy structure from `en.json` and translate
3. Update route validation in `app.py`

## 🧪 Error Handling

The application provides user-friendly error messages for:
- File not selected
- File too large (>1MB)
- Invalid file format (non-CSV)
- Missing column names
- Columns not found in CSV
- Invalid CSV structure
- Network errors
- Processing errors

All errors are displayed with clear, actionable messages in the selected language.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly (development and production modes)
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Python: Follow PEP 8
- JavaScript: Use jQuery conventions
- CSS: BEM-like naming for custom classes
- Comments: English only
- Translations: Add to both `en.json` and `es.json`

## 📝 License

This project is open source and available under the MIT License.
