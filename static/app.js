let currentLang = window.APP_CONFIG.lang;
let translations = window.APP_CONFIG.translations;

const COLUMN_PRESETS = {
    series: 'Intervalo,Tipo de paso,Tiempo,Distancia,Ritmo medio,Frecuencia cardiaca media,Ascenso total,Descenso total',
    training: 'Vueltas,Tiempo,Tiempo acumulado,Distancia km,Ritmo medio min/km,Frecuencia cardiaca media ppm,Ascenso total m,Descenso total m'
};

$(document).ready(function() {
    setupEventListeners();
});

function setupEventListeners() {
    $('#langToggle').on('click', toggleLanguage);
    $('#fileInput').on('change', handleFileSelect);
    $('#viewButton').on('click', handleView);
    $('#downloadButton').on('click', handleDownload);
    setupPresetButtons();
    setupDragAndDrop();
}

function setupPresetButtons() {
    $('.preset-button').on('click', function() {
        const preset = $(this).data('preset');
        if (preset && COLUMN_PRESETS[preset]) {
            applyPreset(preset);
        }
    });
}

function applyPreset(preset) {
    const $columnsInput = $('#columnsInput');
    $columnsInput.val(COLUMN_PRESETS[preset]);
    $columnsInput.focus().select();
}

function toggleLanguage() {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    window.location.href = '/' + newLang;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    updateFileInfo(file);
}

function setupDragAndDrop() {
    const $dropZone = $('#dropZone');
    const $fileInput = $('#fileInput');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        $dropZone.on(eventName, preventDefaults);
        $('body').on(eventName, preventDefaults);
    });

    $dropZone.on('dragenter dragover', function() {
        $(this).addClass('drag-over');
    });

    $dropZone.on('dragleave drop', function() {
        $(this).removeClass('drag-over');
    });

    $dropZone.on('drop', handleDrop);

    $dropZone.on('click', function(e) {
        if (!$(e.target).closest('.remove-file-btn').length) {
            $fileInput.click();
        }
    });

    $('#removeFileBtn').on('click', function(e) {
        e.stopPropagation();
        removeFile();
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.originalEvent.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];

        if (!file.name.endsWith('.csv')) {
            showAlert('error', translations.errors.invalidFormat);
            return;
        }

        if (file.size > 1048576) {
            showAlert('error', translations.errors.fileTooLarge);
            return;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        $('#fileInput')[0].files = dataTransfer.files;

        updateFileInfo(file);
    }
}

function updateFileInfo(file) {
    const $dropZoneContent = $('.drop-zone-content');
    const $fileInfo = $('#fileInfo');
    const $fileName = $('#fileName');

    if (file) {
        $dropZoneContent.hide();
        $fileInfo.show();
        $fileName.text(file.name);
        $('#dropZone').removeClass('drag-over');
    } else {
        $dropZoneContent.show();
        $fileInfo.hide();
        $fileName.text('');
    }
}

function removeFile() {
    $('#fileInput').val('');
    updateFileInfo(null);
    hideAlert();
}

function validateForm() {
    const file = $('#fileInput')[0].files[0];
    const columns = $('#columnsInput').val().trim();

    if (!file) {
        showAlert('error', translations.errors.noFile);
        return false;
    }

    if (!file.name.endsWith('.csv')) {
        showAlert('error', translations.errors.invalidFormat);
        return false;
    }

    if (file.size > 1048576) {
        showAlert('error', translations.errors.fileTooLarge);
        return false;
    }

    if (!columns) {
        showAlert('error', translations.errors.noColumns);
        return false;
    }

    return true;
}

async function handleView() {
    if (!validateForm()) return;

    hideAlert();
    showLoading();

    try {
        const columnsInput = $('#columnsInput').val();

        const formData = new FormData();
        formData.append('file', $('#fileInput')[0].files[0]);
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

async function handleDownload() {
    if (!validateForm()) return;

    hideAlert();
    showLoading();

    try {
        const formData = new FormData();
        formData.append('file', $('#fileInput')[0].files[0]);
        formData.append('columns', $('#columnsInput').val());
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

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

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

function handleError(data, status) {
    let errorMessage = translations.errors.processingError;

    if (status === 413) {
        errorMessage = translations.errors.fileTooLarge;
    } else if (data.error) {
        if (data.missing) {
            errorMessage = translations.errors.columnsNotFound + ': ' + data.missing.join(', ');
        } else if (data.error.includes('CSV')) {
            errorMessage = translations.errors.invalidCSV;
        } else {
            errorMessage = data.error;
        }
    }

    showAlert('error', errorMessage);
}

function displayResults(data, columnOrder) {
    const $resultsContainer = $('#resultsContainer');
    const $tableHead = $('#tableHead');
    const $tableBody = $('#tableBody');
    const $rowsCount = $('#rowsCount');
    const $noResults = $('#noResults');
    const $resultsTable = $('#resultsTable');
    const $viewToggle = $('#viewToggle');

    $tableHead.empty();
    $tableBody.empty();
    $('#csvText').text('');

    if (!data || data.length === 0) {
        $resultsTable.hide();
        $noResults.show();
        $viewToggle.hide();
        $resultsContainer.addClass('visible');
        showAlert('info', translations.noResults);
        return;
    }

    $noResults.hide();
    $resultsTable.show();
    $viewToggle.show();

    $rowsCount.text(data.length);

    const columns = columnOrder && columnOrder.length > 0 ? columnOrder : Object.keys(data[0]);

    const $headerRow = $('<tr>');
    columns.forEach(col => {
        $headerRow.append($('<th>').text(col));
    });
    $tableHead.append($headerRow);

    data.forEach(row => {
        const $tr = $('<tr>');
        columns.forEach(col => {
            $tr.append($('<td>').text(row[col] || ''));
        });
        $tableBody.append($tr);
    });

    generateCSVText(data, columns);
    setupViewToggle();

    $resultsContainer.addClass('visible');
    $resultsContainer[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateCSVText(data, columns) {
    const $csvText = $('#csvText');
    let csvContent = '';

    csvContent += columns.join(',') + '\n';

    data.forEach(row => {
        const rowValues = columns.map(col => {
            const value = row[col] || '';
            // Escape CSV special characters
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csvContent += rowValues.join(',') + '\n';
    });

    $csvText.text(csvContent);
}

function setupViewToggle() {
    const $tableViewBtn = $('#tableViewBtn');
    const $csvViewBtn = $('#csvViewBtn');
    const $tableView = $('#tableView');
    const $csvView = $('#csvView');
    const $copyCsvBtn = $('#copyCsvBtn');

    $tableViewBtn.off('click');
    $csvViewBtn.off('click');
    $copyCsvBtn.off('click');

    $tableViewBtn.on('click', function() {
        $(this).addClass('active');
        $csvViewBtn.removeClass('active');
        $tableView.show();
        $csvView.hide();
    });

    $csvViewBtn.on('click', function() {
        $(this).addClass('active');
        $tableViewBtn.removeClass('active');
        $tableView.hide();
        $csvView.show();
    });

    $copyCsvBtn.on('click', async function() {
        const csvText = $('#csvText').text();
        try {
            await navigator.clipboard.writeText(csvText);
            showAlert('success', translations.success.copied || 'CSV copied to clipboard');
        } catch (err) {
            // Fallback for older browsers
            const $textArea = $('<textarea>')
                .val(csvText)
                .css({
                    position: 'fixed',
                    opacity: 0
                })
                .appendTo('body');

            $textArea[0].select();

            try {
                document.execCommand('copy');
                showAlert('success', translations.success.copied || 'CSV copied to clipboard');
            } catch (err2) {
                showAlert('error', translations.errors.copyFailed || 'Failed to copy');
            }

            $textArea.remove();
        }
    });
}

function showAlert(type, message) {
    const $alert = $('#alert');
    const $alertMessage = $('#alertMessage');

    $alert.removeClass('alert-error alert-success alert-info');
    $alert.addClass('alert-' + type);
    $alertMessage.text(message);
    $alert.addClass('visible');
}

function hideAlert() {
    $('#alert').removeClass('visible');
}

function showLoading() {
    $('#loading').addClass('visible');
}

function hideLoading() {
    $('#loading').removeClass('visible');
}

