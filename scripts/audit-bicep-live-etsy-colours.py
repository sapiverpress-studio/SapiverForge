#!/usr/bin/env python3
"""Read-only visual colour audit of three EXISTING Sapiver Prints Etsy listing covers.
Uses the repository's public catalogue thumbnail URLs; no Etsy write/API credentials.
The audit never downloads source artwork or touches merchant settings.
"""
import colorsys
import io
import json
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from PIL import Image

LISTINGS = {
    4623842263: "terracotta",
    4623850034: "teal",
    4623850842: "plum",
}
EXPECTED_SHOP = "i.etsystatic.com"

def palette(image):
    image = image.convert("RGB")
    image.thumbnail((800, 800))
    counts = {"terracotta": 0, "plum": 0, "teal": 0, "other": 0}
    for r, g, b in image.getdata():
        hue, sat, val = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        if sat < 0.32 or val < 0.20:
            continue
        if (hue < 0.14 or hue >= 0.98):
            counts["terracotta"] += 1
        elif 0.71 <= hue < 0.97:
            counts["plum"] += 1
        elif 0.39 <= hue < 0.60:
            counts["teal"] += 1
        else:
            counts["other"] += 1
    return counts

def classify(counts):
    return max(("terracotta", "plum", "teal"), key=lambda k: counts[k])

def main():
    feed = json.loads(Path("data/etsy-public-catalog.json").read_text())
    items = {int(x["id"]): x for x in feed["items"]}
    results = []
    for listing_id, expected in LISTINGS.items():
        item = items[listing_id]
        url = item["image"]
        parsed = urlsplit(url)
        assert parsed.scheme == "https" and parsed.hostname == EXPECTED_SHOP and parsed.path.endswith(".jpg")
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 (Sapiver Prints listing image audit)"})
        with urlopen(request, timeout=20) as resp:
            assert resp.status == 200 and resp.headers.get_content_type() == "image/jpeg"
            data = resp.read(5_000_000)
        counts = palette(Image.open(io.BytesIO(data)))
        vivid = sum(counts.values())
        winner = classify(counts)
        print(json.dumps({"listing_id": listing_id, "title": item["title"], "expected": expected,
            "observed": winner, "pixels": vivid, "colour_counts": counts, "match": winner == expected}))
        results.append((listing_id, expected, winner, counts))
    if not all(expected == winner for _, expected, winner, _ in results):
        print("MISMATCH: live Etsy listing thumbnails do not match advertised colour names")
    else:
        print("MATCH: live Etsy listing covers correspond to current titles")
    # An audit may reveal wrong colors; return success so data is not lost.
    assert len(results) == 3

if __name__ == "__main__":
    main()
