#!/usr/bin/env python3
import argparse
import hashlib
import json
import statistics
import unicodedata
from pathlib import Path

from PIL import Image, ImageChops


def normalized_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFC", value).split())


def visible_grapheme_count(value: str) -> int:
    normalized = unicodedata.normalize("NFC", value)
    return sum(1 for character in normalized if not character.isspace() and not unicodedata.combining(character))


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def background_color(image: Image.Image):
    rgb = image.convert("RGB")
    width, height = rgb.size
    points = []
    sample = max(1, min(width, height) // 100)
    for x0, y0 in ((0, 0), (width - sample, 0), (0, height - sample), (width - sample, height - sample)):
        for y in range(y0, min(height, y0 + sample)):
            for x in range(x0, min(width, x0 + sample)):
                points.append(rgb.getpixel((x, y)))
    return tuple(int(statistics.median(channel)) for channel in zip(*points))


def subject_mask(image: Image.Image, background, threshold: int):
    rgb = image.convert("RGB")
    bg = Image.new("RGB", rgb.size, background)
    diff = ImageChops.difference(rgb, bg).convert("L")
    return diff.point(lambda value: 255 if value >= threshold else 0)


def row_bounds(mask: Image.Image):
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError("No flat title subject was detected")
    left, top, right, bottom = bbox
    width = right - left
    pixels = mask.load()
    projection = [sum(1 for x in range(left, right) if pixels[x, y]) for y in range(top, bottom)]
    start = max(1, int(len(projection) * 0.22))
    end = min(len(projection) - 1, int(len(projection) * 0.78))
    split_offset = min(range(start, end), key=lambda index: projection[index])
    if projection[split_offset] > max(projection) * 0.08:
        raise ValueError("A clear gap between exactly two flat title rows was not detected")
    split_y = top + split_offset
    upper = mask.crop((left, top, right, split_y)).getbbox()
    lower = mask.crop((left, split_y + 1, right, bottom)).getbbox()
    if not upper or not lower:
        raise ValueError("Both proxy rows must contain visible glyphs")
    upper_box = (left + upper[0], top + upper[1], left + upper[2], top + upper[3])
    lower_box = (left + lower[0], split_y + 1 + lower[1], left + lower[2], split_y + 1 + lower[3])
    return [upper_box, lower_box]


def main():
    parser = argparse.ArgumentParser(description="Recompose a validated two-row flat title source into one undistorted row.")
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--geometry-plan", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--row1-text", required=True)
    parser.add_argument("--row2-text", required=True)
    parser.add_argument("--join-with", default=" ")
    parser.add_argument("--threshold", type=int, default=20)
    parser.add_argument("--gap-ratio", type=float, default=0.28)
    parser.add_argument("--padding-ratio", type=float, default=0.08)
    parser.add_argument("--height-tolerance", type=float, default=0.08)
    parser.add_argument("--ratio-tolerance", type=float, default=0.15)
    args = parser.parse_args()

    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    manifest_path = Path(args.manifest).resolve()
    plan_path = Path(args.geometry_plan).resolve()
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if plan.get("schema") not in {"typecore-title-geometry-plan/v1", "typecore-title-geometry-plan/v2"} or plan.get("status") != "planned":
        raise ValueError("A passing typecore-title-geometry-plan artifact is required")
    selected = plan.get("selected") or {}
    proxy = plan.get("proxyRecomposition") or {}
    if selected.get("lineCount") != 1 or selected.get("verticalScale") != 1 or not proxy.get("eligible"):
        raise ValueError("Proxy recomposition requires an eligible passing final single-line plan with verticalScale 1")
    proxy_rows = (proxy.get("candidate") or {}).get("rows")
    supplied_rows = [args.row1_text, args.row2_text]
    if proxy_rows != supplied_rows:
        raise ValueError("Supplied row texts must exactly match the geometry plan proxy rows")
    reconstructed = normalized_text(args.row1_text + args.join_with + args.row2_text)
    if reconstructed != normalized_text(args.text) or reconstructed != normalized_text(plan.get("exactText", "")):
        raise ValueError("Proxy row texts do not reconstruct the exact title text")

    image = Image.open(source).convert("RGB")
    background = background_color(image)
    mask = subject_mask(image, background, args.threshold)
    boxes = row_bounds(mask)
    heights = [box[3] - box[1] for box in boxes]
    height_delta = abs(heights[0] - heights[1]) / max(heights)
    if height_delta > args.height_tolerance:
        raise ValueError(f"Proxy row height mismatch {height_delta:.4f} exceeds {args.height_tolerance:.4f}")

    constraints = plan.get("constraints") or {}
    min_glyph_aspect = float(constraints.get("minGlyphAspectRatio", 0.78))
    max_glyph_aspect = float(constraints.get("maxGlyphAspectRatio", 1.15))
    row_character_counts = [visible_grapheme_count(value) for value in supplied_rows]
    if any(count <= 0 for count in row_character_counts):
        raise ValueError("Both proxy rows must contain visible characters")
    source_glyph_aspects = [
        (box[2] - box[0]) / count / height
        for box, count, height in zip(boxes, row_character_counts, heights)
    ]
    if any(value < min_glyph_aspect or value > max_glyph_aspect for value in source_glyph_aspects):
        raise ValueError(
            f"Proxy mean per-glyph width/height {source_glyph_aspects} must remain within "
            f"{min_glyph_aspect:.4f}-{max_glyph_aspect:.4f}; condensed tall-narrow source rejected"
        )

    target_height = min(heights)
    row_images = []
    transforms = []
    for box in boxes:
        crop = image.crop(box)
        if crop.height != target_height:
            target_width = round(crop.width * target_height / crop.height)
            crop = crop.resize((target_width, target_height), Image.Resampling.LANCZOS)
            transforms.append({"kind": "uniform-downscale", "sourceBox": box, "outputSize": crop.size})
        else:
            transforms.append({"kind": "translate-only", "sourceBox": box, "outputSize": crop.size})
        row_images.append(crop)

    gap = max(1, round(target_height * args.gap_ratio))
    padding = max(1, round(target_height * args.padding_ratio))
    canvas_width = padding * 2 + sum(row.width for row in row_images) + gap
    canvas_height = padding * 2 + target_height
    canvas = Image.new("RGB", (canvas_width, canvas_height), background)
    x = padding
    placements = []
    for row in row_images:
        y = padding + target_height - row.height
        canvas.paste(row, (x, y))
        placements.append({"x": x, "y": y, "width": row.width, "height": row.height})
        x += row.width + gap

    output_mask = subject_mask(canvas, background, args.threshold)
    visible = output_mask.getbbox()
    if not visible:
        raise ValueError("Recomposed output contains no visible title subject")
    visible_width = visible[2] - visible[0]
    visible_height = visible[3] - visible[1]
    artwork_ratio = visible_width / visible_height
    planned_ratio = float(selected.get("artworkRatio"))
    ratio_delta = abs(artwork_ratio - planned_ratio) / planned_ratio
    if ratio_delta > args.ratio_tolerance:
        raise ValueError(
            f"Recomposed ratio {artwork_ratio:.4f} is incompatible with final plan {planned_ratio:.4f} "
            f"(tolerance {args.ratio_tolerance:.4f})"
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, format="PNG")
    manifest = {
        "schema": "typecore-title-proxy-recomposition/v1",
        "status": "pass",
        "exactText": normalized_text(args.text),
        "source": str(source),
        "sourceSha256": file_sha256(source),
        "geometryPlan": str(plan_path),
        "sourceRows": supplied_rows,
        "sourceRowBounds": boxes,
        "sourceRowCharacterCounts": row_character_counts,
        "sourceMeanGlyphAspectRatios": [round(value, 6) for value in source_glyph_aspects],
        "allowedGlyphAspectRatio": {"min": min_glyph_aspect, "max": max_glyph_aspect},
        "rowHeightDelta": round(height_delta, 6),
        "transforms": transforms,
        "placements": placements,
        "gapPixels": gap,
        "paddingPixels": padding,
        "verticalScale": 1,
        "nonProportionalScaling": False,
        "materialBeforeRecomposition": False,
        "output": str(output),
        "outputSha256": file_sha256(output),
        "outputSize": canvas.size,
        "visibleBounds": visible,
        "artworkRatio": round(artwork_ratio, 6),
        "plannedArtworkRatio": planned_ratio,
        "ratioDelta": round(ratio_delta, 6),
        "shapeAuthority": "recomposed-one-line-flat"
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
