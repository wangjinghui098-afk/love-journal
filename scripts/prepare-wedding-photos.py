from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
CONTACT_COLUMNS = 4
CONTACT_ROWS = 5
CONTACT_CELL_WIDTH = 320
CONTACT_CELL_HEIGHT = 250
CONTACT_IMAGE_HEIGHT = 214


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create optimized web images, thumbnails and contact sheets.",
    )
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--contact-dir", required=True, type=Path)
    return parser.parse_args()


def resized(image: Image.Image, max_side: int) -> Image.Image:
    scale = min(1.0, max_side / max(image.size))
    if scale == 1.0:
        return image.copy()
    size = tuple(max(1, round(side * scale)) for side in image.size)
    return image.resize(size, Image.Resampling.LANCZOS)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(
        image,
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.42),
    )


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("segoeui.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_contact_sheets(
    inventory: list[dict],
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    page_size = CONTACT_COLUMNS * CONTACT_ROWS
    pages = math.ceil(len(inventory) / page_size)
    label_font = font(17)

    for page in range(pages):
        rows = CONTACT_ROWS
        sheet = Image.new(
            "RGB",
            (CONTACT_COLUMNS * CONTACT_CELL_WIDTH, rows * CONTACT_CELL_HEIGHT),
            "#171412",
        )
        draw = ImageDraw.Draw(sheet)
        start = page * page_size
        chunk = inventory[start : start + page_size]

        for offset, item in enumerate(chunk):
            column = offset % CONTACT_COLUMNS
            row = offset // CONTACT_COLUMNS
            x = column * CONTACT_CELL_WIDTH
            y = row * CONTACT_CELL_HEIGHT
            with Image.open(item["thumb_path"]) as thumb:
                thumb = thumb.convert("RGB")
                preview = cover(
                    thumb,
                    (CONTACT_CELL_WIDTH - 14, CONTACT_IMAGE_HEIGHT),
                )
            sheet.paste(preview, (x + 7, y + 7))
            draw.rectangle(
                (x + 7, y + CONTACT_IMAGE_HEIGHT + 7, x + CONTACT_CELL_WIDTH - 7, y + CONTACT_CELL_HEIGHT),
                fill="#211c19",
            )
            draw.text(
                (x + 12, y + CONTACT_IMAGE_HEIGHT + 13),
                f'{item["index"]:03d}  {item["original_name"]}',
                fill="#f2dfc7",
                font=label_font,
            )

        sheet.save(output_dir / f"wedding-contact-{page + 1}.jpg", quality=88)


def main() -> None:
    args = parse_args()
    sources = sorted(
        [
            path
            for path in args.source.iterdir()
            if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
        ],
        key=lambda path: path.name.casefold(),
    )
    if not sources:
        raise SystemExit("No source images found.")

    output_dir = args.output
    thumb_dir = output_dir / "thumbs"
    grid_dir = output_dir / "grid"
    output_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)
    grid_dir.mkdir(parents=True, exist_ok=True)
    inventory: list[dict] = []

    for index, source in enumerate(sources, start=1):
        stem = f"wedding-{index:03d}"
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            width, height = image.size
            web_image = resized(image, 1400)
            thumb_image = resized(image, 800)
            grid_image = resized(image, 360)
            web_path = output_dir / f"{stem}.webp"
            thumb_path = thumb_dir / f"{stem}.webp"
            grid_path = grid_dir / f"{stem}.webp"
            web_image.save(web_path, "WEBP", quality=82, method=6)
            thumb_image.save(thumb_path, "WEBP", quality=74, method=6)
            grid_image.save(grid_path, "WEBP", quality=70, method=6)

        inventory.append(
            {
                "index": index,
                "original_name": source.name,
                "width": width,
                "height": height,
                "orientation": "portrait" if height >= width else "landscape",
                "src": f"photos/wedding/{web_path.name}",
                "thumb": f"photos/wedding/thumbs/{thumb_path.name}",
                "grid": f"photos/wedding/grid/{grid_path.name}",
                "thumb_path": str(thumb_path),
            }
        )

    make_contact_sheets(inventory, args.contact_dir)
    manifest_path = args.contact_dir / "wedding-inventory.json"
    manifest_path.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "count": len(inventory),
                "web_bytes": sum(
                    path.stat().st_size for path in output_dir.glob("*.webp")
                ),
                "thumb_bytes": sum(
                    path.stat().st_size for path in thumb_dir.glob("*.webp")
                ),
                "grid_bytes": sum(
                    path.stat().st_size for path in grid_dir.glob("*.webp")
                ),
                "manifest": str(manifest_path),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
