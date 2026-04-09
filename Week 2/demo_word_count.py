import csv
from pathlib import Path

INPUT_CSV = Path(__file__).with_name("demo_responses.csv")
MAX_RESPONSES = 50


def count_words(text: str) -> int:
    """Return number of words in a response string."""
    return len(text.split())


def main() -> None:
    word_counts: list[int] = []

    with INPUT_CSV.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if "response" not in (reader.fieldnames or []):
            raise ValueError("CSV must include a 'response' column.")

        print(f"{'ID':<8}{'Words':<8}Response (first 60 chars)")
        print("-" * 90)

        for i, row in enumerate(reader, start=1):
            if i > MAX_RESPONSES:
                break

            response = (row.get("response") or "").strip()
            if not response:
                print(f"Warning: skipped response #{i} (empty text).")
                continue

            row_id = (row.get("participant_id") or f"R{i:03d}").strip()
            words = count_words(response)
            word_counts.append(words)
            preview = response[:60]
            print(f"{row_id:<8}{words:<8}{preview}")

    if not word_counts:
        print("\nNo valid responses found.")
        return

    average = sum(word_counts) / len(word_counts)
    print("\nSummary")
    print("-" * 70)
    print(f"Total responses processed: {len(word_counts)}")
    print(f"Shortest response: {min(word_counts)} words")
    print(f"Longest response: {max(word_counts)} words")
    print(f"Average response length: {average:.1f} words")


if __name__ == "__main__":
    main()
