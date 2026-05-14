#!/usr/bin/env python3
"""Pull Yellowstone National Park data from the RIDB API (recreation.gov).

Loads ``RIDB_API_KEY`` from ``.env`` or ``yellowstone.env`` in this project folder.

Usage (from project root ``mp1_yellowstone/``)::

    python yellowstone_API.py
    python yellowstone_API.py --save data/raw/yellowstone_facilities.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow ``python yellowstone_API.py`` from project root without installing a package.
_ROOT = Path(__file__).resolve().parent
if str(_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_ROOT / "src"))

from fetch_ridb import (  # noqa: E402
    YELLOWSTONE_REC_AREA_ID,
    fetch_yellowstone_facilities_snapshot,
    get_recarea,
    search_recareas,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Query RIDB for Yellowstone NP data.")
    parser.add_argument(
        "--save",
        type=Path,
        default=None,
        help="Optional path to write facilities JSON (e.g. data/raw/yellowstone_facilities.json)",
    )
    args = parser.parse_args()

    matches = search_recareas("Yellowstone National Park", limit=10)
    print("Rec areas matching 'Yellowstone National Park' (first 10):")
    for row in matches:
        name = row.get("RecAreaName")
        rid = row.get("RecAreaID")
        print(f"  - {name} (RecAreaID={rid})")

    meta = get_recarea(YELLOWSTONE_REC_AREA_ID)
    print("\nSelected rec area (YELLOWSTONE_REC_AREA_ID):")
    print(json.dumps(meta, indent=2)[:1200] + ("..." if len(json.dumps(meta)) > 1200 else ""))

    facilities = fetch_yellowstone_facilities_snapshot(out_path=args.save)
    print(f"\nFacilities under rec area {YELLOWSTONE_REC_AREA_ID}: {len(facilities)} rows")
    for row in facilities[:8]:
        print(f"  - {row.get('FacilityName')} (FacilityID={row.get('FacilityID')})")
    if len(facilities) > 8:
        print("  ...")

    if args.save:
        print(f"\nWrote {args.save.resolve()}")


if __name__ == "__main__":
    main()
