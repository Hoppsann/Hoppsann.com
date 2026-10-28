"""
Make WebP thumbnails for the gallery grid.

Run from the repo root after adding new photos to img/gallery/:

    pip install pillow
    python tools/make_thumbs.py

Thumbnails go to img/gallery/thumbs/<name>.webp. Existing thumbnails are
skipped unless you pass --force. gallery.js finds them automatically from
each photo's file name, so photos.json does not need to change.
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
GALLERY = ROOT / "img" / "gallery"
THUMBS = GALLERY / "thumbs"

MAX_WIDTH = 600
QUALITY = 72
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def main() -> None:
    force = "--force" in sys.argv
    THUMBS.mkdir(exist_ok=True)

    made = skipped = 0
    for src in sorted(GALLERY.iterdir()):
        if not src.is_file() or src.suffix.lower() not in EXTENSIONS:
            continue

        out = THUMBS / f"{src.stem}.webp"
        if out.exists() and not force:
            skipped += 1
            continue

        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            if im.width > MAX_WIDTH:
                height = round(im.height * MAX_WIDTH / im.width)
                im = im.resize((MAX_WIDTH, height), Image.LANCZOS)
            im.save(out, "WEBP", quality=QUALITY, method=6)
        made += 1

    print(f"made {made} thumbnails, skipped {skipped} existing")


if __name__ == "__main__":
    main()
