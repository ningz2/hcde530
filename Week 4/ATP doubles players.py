"""
Fetch ATP doubles rankings and export top players to CSV.

Fields in output:
- ranking
- player_name
- points
- career_titles_list
"""

from __future__ import annotations

import csv
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

#import dotenv from standard library
try:
    from dotenv import load_dotenv  # type: ignore[import-untyped]
except ImportError:
    load_dotenv = None

#define the API host and default URL
API_HOST = "tennis-api-atp-wta-itf.p.rapidapi.com"
DEFAULT_ATP_DOUBLES_RANKINGS_URL = (
    "https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/ranking/doubles"
)
OUTPUT_CSV = Path(__file__).resolve().parent / "ATP Double Top60.csv"
TOP_N = 60

#define a function to load the environment variables
def _load_environment() -> str:
    env_path = Path(__file__).resolve().parent / ".env"
    if load_dotenv is not None:
        load_dotenv(dotenv_path=env_path)
    elif env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())

    api_key = os.environ.get("YOUR_KEY_NAME")
    if not api_key:
        raise RuntimeError("Missing API key. Add YOUR_KEY_NAME to Week 4/.env, then run again.")
    return api_key

#define a function to create an SSL context
def _ssl_context() -> ssl.SSLContext:
    try:
        import certifi  # type: ignore[import-untyped]

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()

#define a function to fetch JSON data from an endpoint
def fetch_json(api_key: str, endpoint: str) -> dict[str, Any]:
    req = urllib.request.Request(
        endpoint,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": os.environ.get(
                "TENNIS_API_USER_AGENT",
                (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            ),
            "x-rapidapi-host": API_HOST,
            "x-rapidapi-key": api_key,
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=_ssl_context()) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP error {err.code} from endpoint {endpoint}: {detail or err.reason}") from err
    except urllib.error.URLError as err:
        raise RuntimeError(f"Network error calling endpoint {endpoint}: {err.reason}") from err

    try:
        return json.loads(raw)
    except json.JSONDecodeError as err:
        raise RuntimeError("API response is not valid JSON.") from err

#define a function to fetch the list of ATP player titles
def fetch_atp_player_titles_list(api_key: str, player_id: int) -> str:
    endpoint = (
        "https://tennis-api-atp-wta-itf.p.rapidapi.com"
        f"/tennis/v2/atp/player/titles/{player_id}"
    )
    data = fetch_json(api_key=api_key, endpoint=endpoint)
    items = data.get("data", []) if isinstance(data, dict) else []
    if not isinstance(items, list):
        return "NA"

    chunks: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        tour = str(item.get("tourRank", "")).strip()
        won = str(item.get("titlesWon", "")).strip()
        if not tour or not won:
            continue
        chunks.append(f"{tour}:{won}")
    return " | ".join(chunks) if chunks else "NA"

#define a function to normalize the rankings data
def normalize_rankings(data: dict[str, Any], limit: int) -> list[dict[str, Any]]:
    rows = data.get("data", [])
    if not isinstance(rows, list):
        raise RuntimeError("Unexpected rankings response shape: 'data' is not a list.")

    players: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        player = row.get("player", {})
        if not isinstance(player, dict):
            player = {}
        player_id = player.get("id")
        if player_id is None:
            continue

        players.append(
            {
                "ranking": row.get("position", ""),
                "player_name": str(player.get("name", "NA")),
                "points": row.get("pts", row.get("point", row.get("points", "NA"))),
                "player_id": player_id,
                "career_titles_list": "NA",
            }
        )
        if len(players) == limit:
            break

    return players

#define a function to write the data to a CSV file
def write_csv(rows: list[dict[str, Any]]) -> None:
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["ranking", "player_name", "points", "career_titles_list"],
        )
        writer.writeheader()
        writer.writerows(rows)

#define the main function
def main() -> None:
    api_key = _load_environment()
    rankings_url = os.environ.get("ATP_DOUBLES_RANKINGS_URL", DEFAULT_ATP_DOUBLES_RANKINGS_URL)
    rankings_data = fetch_json(api_key=api_key, endpoint=rankings_url)
    players = normalize_rankings(rankings_data, limit=TOP_N)

    for row in players:
        try:
            row["career_titles_list"] = fetch_atp_player_titles_list(
                api_key=api_key, player_id=int(row["player_id"])
            )
        except Exception:
            row["career_titles_list"] = "NA"

    for row in players:
        row.pop("player_id", None)

    if len(players) < TOP_N:
        print(
            f"Warning: doubles rankings endpoint returned only {len(players)} players (expected {TOP_N}).",
            file=sys.stderr,
        )

    write_csv(players)
    print(f"Wrote {len(players)} rows to {OUTPUT_CSV}", file=sys.stderr)


if __name__ == "__main__":
    main()
