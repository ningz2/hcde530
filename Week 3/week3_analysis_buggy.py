import csv
from pathlib import Path

# Spelled-out years (messy survey text) -> integer. Extend if new variants appear.
_SPELLED_YEARS = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
}


def parse_experience_years(raw: str, row_id: str) -> int | None:
    """Return years as int, or None if the value cannot be parsed (warning printed)."""
    text = raw.strip()
    if not text:
        print(f"  Warning: empty experience_years for {row_id}, skipped for average.")
        return None
    try:
        return int(text)
    except ValueError:
        key = text.lower()
        if key in _SPELLED_YEARS:
            return _SPELLED_YEARS[key]
        print(
            f"  Warning: could not parse experience_years {text!r} for {row_id}, "
            "skipped for average."
        )
        return None


# Load the survey data from a CSV file
filename = Path("week3_survey_messy.csv")
rows = []

with filename.open(newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

# Count responses by role
# Normalize role names so "ux researcher" and "UX Researcher" are counted together
role_counts = {}

for row in rows:
    role = row["role"].strip().title()
    if role in role_counts:
        role_counts[role] += 1
    else:
        role_counts[role] = 1

print("Responses by role:")
for role, count in sorted(role_counts.items()):
    print(f"  {role}: {count}")

# Calculate the average years of experience (only rows with parseable values;
# spelled-out numbers like "fifteen" are normalized first.)
total_experience = 0
experience_count = 0
for row in rows:
    row_id = row.get("response_id", row.get("participant_name", "unknown row"))
    years = parse_experience_years(row["experience_years"], row_id)
    if years is not None:
        total_experience += years
        experience_count += 1

if experience_count:
    avg_experience = total_experience / experience_count
    print(f"\nAverage years of experience: {avg_experience:.1f}")
    if experience_count != len(rows):
        print(
            f"  (based on {experience_count} of {len(rows)} row(s) with valid "
            "experience_years)"
        )
else:
    print("\nAverage years of experience: n/a (no parseable experience_years values)")

# Find the top 5 highest satisfaction scores
scored_rows = []
for row in rows:
    if row["satisfaction_score"].strip():
        scored_rows.append((row["participant_name"], int(row["satisfaction_score"])))

scored_rows.sort(key=lambda x: x[1])
top5 = scored_rows[:5]

print("\nTop 5 satisfaction scores:")
for name, score in top5:
    print(f"  {name}: {score}")
