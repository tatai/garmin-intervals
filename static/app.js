// Global state
let currentLang = window.APP_CONFIG.lang;
let translations = window.APP_CONFIG.translations;

// Column presets
const COLUMN_PRESETS = {
    series: 'Intervalo,Tipo de paso,Tiempo,Distancia,Ritmo medio,Frecuencia cardiaca media,Ascenso total,Descenso total',
    training: 'Vueltas,Tiempo,Tiempo acumulado,Distanciakm,Ritmo mediomin/km,Frecuencia cardiaca mediappm,Ascenso totalm,Descenso totalm'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Language toggle - redirect to other language
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);

    // File input change
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

    // View button
    document.getElementById('viewButton').addEventListener('click', handleView);

    // Download button
    document.getElementById('downloadButton').addEventListener('click', handleDownload);

    // Column preset buttons
    setupPresetButtons();
}

// Setup preset buttons
function setupPresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-button');

    presetButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const preset = event.currentTarget.getAttribute('data-preset');
            if (preset && COLUMN_PRESETS[preset]) {
                applyPreset(preset);
            }
        });
    });
}

function applyPreset(preset) {
    const columnsInput = document.getElementById('columnsInput');
    columnsInput.value = COLUMN_PRESETS[preset];

    columnsInput.focus();
    columnsInput.select();
}

function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    window.location.href = '/' + newLang;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileName = document.getElementById('fileName');

    if (file) {
        fileName.textContent = file.name;
    } else {
        fileName.textContent = translations.noFileSelected;
    }
}

function validateForm() {
    const fileInput = document.getElementById('fileInput');
    const columnsInput = document.getElementById('columnsInput');

    if (!fileInput.files || fileInput.files.length === 0) {
        showAlert('error', translations.errors.noFile);
        return false;
    }

    const file = fileInput.files[0];

    if (file.size > 1048576) {
        showAlert('error', translations.errors.fileTooLarge);
        return false;
    }

    if (!file.name.endsWith('.csv')) {
        showAlert('error', translations.errors.invalidFormat);
        return false;
    }

    const columns = columnsInput.value.trim();
    if (!columns) {
        showAlert('error', translations.errors.noColumns);
        return false;
    }

    return true;
}

function showAlert(type, message) {
    const alert = document.getElementById('alert');
    const alertMessage = document.getElementById('alertMessage');

    alert.className = 'alert visible alert-' + type;
    alertMessage.textContent = message;

    setTimeout(() => {
        alert.classList.remove('visible');
    }, 5000);
}

function hideAlert() {
    document.getElementById('alert').classList.remove('visible');
}

function showLoading() {
    document.getElementById('loading').classList.add('visible');
    document.getElementById('viewButton').disabled = true;
    document.getElementById('downloadButton').disabled = true;
}

function hideLoading() {
    document.getElementById('loading').classList.remove('visible');
    document.getElementById('viewButton').disabled = false;
    document.getElementById('downloadButton').disabled = false;
}

async function handleView() {
    if (!validateForm()) return;

    hideAlert();
    showLoading();

    try {
        const columnsInput = document.getElementById('columnsInput').value;

        const formData = new FormData();
        formData.append('file', document.getElementById('fileInput').files[0]);
        formData.append('columns', columnsInput);
        formData.append('output_format', 'json');

        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            handleError(data, response.status);
            return;
        }

        // Display results with column order from user input
        const columnOrder = columnsInput.split(',').map(col => col.trim()).filter(col => col);
        displayResults(data.data, columnOrder);
        showAlert('success', translations.success.processed + ' (' + data.count + ' ' + translations.rowsCount + ')');

    } catch (error) {
        console.error('Error:', error);
        showAlert('error', translations.errors.networkError);
    } finally {
        hideLoading();
    }
}

// Handle download button click
async function handleDownload() {
    if (!validateForm()) return;

    hideAlert();
    showLoading();

    try {
        const formData = new FormData();
        formData.append('file', document.getElementById('fileInput').files[0]);
        formData.append('columns', document.getElementById('columnsInput').value);
        formData.append('output_format', 'csv');

        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            handleError(data, response.status);
            return;
        }

        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'filtered_data.csv';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showAlert('success', translations.success.downloaded);

    } catch (error) {
        console.error('Error:', error);
        showAlert('error', translations.errors.networkError);
    } finally {
        hideLoading();
    }
}

// Handle error response
function handleError(data, status) {
    if (status === 413) {
        showAlert('error', translations.errors.fileTooLarge);
    } else if (data.error === 'Columns not found in CSV' && data.missing) {
        const missingCols = data.missing.join(', ');
        showAlert('error', translations.errors.columnsNotFound + ': ' + missingCols);
    } else if (data.error === 'Invalid CSV file') {
        showAlert('error', translations.errors.invalidCSV + ': ' + (data.message || ''));
    } else {
        showAlert('error', translations.errors.processingError + ': ' + (data.message || data.error || ''));
    }
}

// Display results in table
function displayResults(data, columnOrder) {
    const resultsContainer = document.getElementById('resultsContainer');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const rowsCount = document.getElementById('rowsCount');
    const noResults = document.getElementById('noResults');
    const resultsTable = document.getElementById('resultsTable');
    const csvText = document.getElementById('csvText');
    const viewToggle = document.getElementById('viewToggle');

    // Clear previous results
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    csvText.textContent = '';

    if (!data || data.length === 0) {
        resultsTable.style.display = 'none';
        noResults.style.display = 'block';
        viewToggle.style.display = 'none';
        resultsContainer.classList.add('visible');
        showAlert('info', translations.noResults);
        return;
    }

    // Hide no results message and show table
    noResults.style.display = 'none';
    resultsTable.style.display = 'table';
    viewToggle.style.display = 'flex';

    // Update count
    rowsCount.textContent = data.length;

    // Use column order from user input, or fall back to first row keys
    const columns = columnOrder && columnOrder.length > 0 ? columnOrder : Object.keys(data[0]);

    // Create table header
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Create table rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] || '';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    // Generate CSV text view
    generateCSVText(data, columns);

    // Setup view toggle listeners
    setupViewToggle();

    // Show results
    resultsContainer.classList.add('visible');

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Generate CSV text for copy/paste
function generateCSVText(data, columns) {
    const csvText = document.getElementById('csvText');

    // Create CSV string
    let csvContent = '';

    // Add header
    csvContent += columns.join(',') + '\n';

    // Add data rows
    data.forEach(row => {
        const rowValues = columns.map(col => {
            const value = row[col] || '';
            // Escape values that contain commas or quotes
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csvContent += rowValues.join(',') + '\n';
    });

    csvText.textContent = csvContent;
}

// Setup view toggle between table and CSV
function setupViewToggle() {
    const tableViewBtn = document.getElementById('tableViewBtn');
    const csvViewBtn = document.getElementById('csvViewBtn');
    const tableView = document.getElementById('tableView');
    const csvView = document.getElementById('csvView');
    const copyCsvBtn = document.getElementById('copyCsvBtn');

    // Remove existing listeners by cloning
    const newTableBtn = tableViewBtn.cloneNode(true);
    const newCsvBtn = csvViewBtn.cloneNode(true);
    const newCopyBtn = copyCsvBtn.cloneNode(true);

    tableViewBtn.parentNode.replaceChild(newTableBtn, tableViewBtn);
    csvViewBtn.parentNode.replaceChild(newCsvBtn, csvViewBtn);
    copyCsvBtn.parentNode.replaceChild(newCopyBtn, copyCsvBtn);

    // Add click listeners
    newTableBtn.addEventListener('click', () => {
        newTableBtn.classList.add('active');
        newCsvBtn.classList.remove('active');
        tableView.style.display = 'block';
        csvView.style.display = 'none';
    });

    newCsvBtn.addEventListener('click', () => {
        newCsvBtn.classList.add('active');
        newTableBtn.classList.remove('active');
        tableView.style.display = 'none';
        csvView.style.display = 'block';
    });

    // Copy CSV functionality
    newCopyBtn.addEventListener('click', async () => {
        const csvText = document.getElementById('csvText');
        try {
            await navigator.clipboard.writeText(csvText.textContent);
            showAlert('success', translations.success.copied || 'CSV copied to clipboard');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = csvText.textContent;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showAlert('success', translations.success.copied || 'CSV copied to clipboard');
            } catch (err2) {
                showAlert('error', translations.errors.copyFailed || 'Failed to copy');
            }
            document.body.removeChild(textArea);
        }
    });
}



