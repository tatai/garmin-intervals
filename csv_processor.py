"""
Module to process Garmin Connect training CSV files.
Filters specific columns and removes summary rows.
"""

import csv
import io
from typing import List, Dict, Any


class ColumnNotFoundError(Exception):
    """Exception raised when requested columns are not found in CSV."""
    def __init__(self, missing_columns: List[str]):
        self.missing_columns = missing_columns
        super().__init__(f"Columns not found: {', '.join(missing_columns)}")


class InvalidCSVError(Exception):
    """Exception raised when CSV file is invalid or cannot be parsed."""
    pass


def process_csv(file_stream: io.BytesIO, columns_to_extract: List[str]) -> List[Dict[str, Any]]:
    """
    Process a Garmin Connect CSV file and extract specified columns.

    Args:
        file_stream: File stream containing CSV data
        columns_to_extract: List of column names to extract

    Returns:
        List of dictionaries with filtered data

    Raises:
        ColumnNotFoundError: If any requested column is not found in CSV
        InvalidCSVError: If CSV cannot be parsed or is invalid
    """
    try:
        # Try UTF-8 first
        content = file_stream.read().decode('utf-8')
    except UnicodeDecodeError:
        # Fallback to latin-1 for different regional exports
        file_stream.seek(0)
        try:
            content = file_stream.read().decode('latin-1')
        except Exception as e:
            raise InvalidCSVError(f"Unable to decode file: {str(e)}")

    try:
        reader = csv.DictReader(io.StringIO(content))

        # Get the actual fieldnames from CSV
        if reader.fieldnames is None:
            raise InvalidCSVError("CSV file is empty or has no headers")

        # Remove empty fieldname if it exists
        fieldnames = [f for f in reader.fieldnames if f]

        # Check if all requested columns exist
        missing_columns = [col for col in columns_to_extract if col not in fieldnames]
        if missing_columns:
            raise ColumnNotFoundError(missing_columns)

        # Process rows
        filtered_data = []
        for row in reader:
            # Remove the first empty column if it exists
            row.pop('', None)

            # Filter out summary rows (hardcoded as per requirements)
            tipo_paso = row.get('Tipo de paso', '')
            if tipo_paso == 'Resumen' or tipo_paso == '--':
                continue

            # Create filtered row with only requested columns
            filtered_row = {col: row.get(col, '') for col in columns_to_extract}
            filtered_data.append(filtered_row)

        return filtered_data

    except csv.Error as e:
        raise InvalidCSVError(f"Invalid CSV format: {str(e)}")
    except ColumnNotFoundError:
        raise
    except Exception as e:
        raise InvalidCSVError(f"Error processing CSV: {str(e)}")

