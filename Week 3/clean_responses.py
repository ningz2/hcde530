"""Read responses.csv, drop rows with empty name, uppercase role, write CSV."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

REQUIRED_COLUMNS = ("name", "role")
INPUT_NAME = "responses.csv"
OUTPUT_NAME = "responses_cleaned.csv"


def main() -> None:
    input_path = Path(INPUT_NAME)
    output_path = Path(OUTPUT_NAME)

    if not input_path.is_file():
        raise FileNotFoundError(
            f"Could not find '{input_path.resolve()}'. "
            "Run this script from the folder that contains responses.csv."
        )

    with input_path.open(newline="", encoding="utf-8") as infile:
        reader = csv.DictReader(infile)
        if reader.fieldnames is None:
            raise ValueError(f"'{input_path}' has no header row.")

        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            raise ValueError(
                f"Missing required column(s): {', '.join(missing)}. "
                f"Found columns: {', '.join(reader.fieldnames)}"
            )

        fieldnames = list(reader.fieldnames)
        cleaned_rows = []

        for row_num, row in enumerate(reader, start=2):
            name = row.get("name")
            if name is None:
                raise ValueError(f"Row {row_num}: missing 'name' column in data.")

            if name.strip() == "":
                continue

            role = row.get("role")
            if role is None:
                raise ValueError(f"Row {row_num}: missing 'role' column in data.")

            row["role"] = role.strip().upper()
            cleaned_rows.append(row)

    with output_path.open("w", newline="", encoding="utf-8") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)

    print(
        f"Wrote {len(cleaned_rows)} row(s) to '{output_path.resolve()}' "
        f"(read from '{input_path.resolve()}')."
    )


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError) as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
