#!/usr/bin/env python3
"""Bulk-download every asset from this project's Cloudinary account.

The web app uploads via an *unsigned* preset, so `.env` only contains the
cloud name. Listing all assets requires Cloudinary's Admin API, which needs an
API key + secret. Get them from: Cloudinary Console -> Settings -> API Keys.

Usage (PowerShell):
    pip install cloudinary requests
    $env:CLOUDINARY_URL = "cloudinary://<api_key>:<api_secret>@daoy9kqfb"
    python cloudinary_download.py

Or set the parts separately:
    $env:CLOUDINARY_API_KEY = "..."
    $env:CLOUDINARY_API_SECRET = "..."
    python cloudinary_download.py

Assets are saved to ./cloudinary_backup/<resource_type>/<public_id>.<ext>,
preserving Cloudinary's folder structure. Re-running skips files already on disk.
"""

import os
import sys
from pathlib import Path

import cloudinary
import cloudinary.api
import requests

HERE = Path(__file__).resolve().parent
DEST = HERE / "cloudinary_backup"
RESOURCE_TYPES = ("image", "video", "raw")
PAGE_SIZE = 500


def cloud_name_from_env_file() -> str | None:
    """Read VITE_CLOUDINARY_CLOUD_NAME from the project's .env (best effort)."""
    env_path = HERE / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("VITE_CLOUDINARY_CLOUD_NAME="):
            return line.split("=", 1)[1].strip() or None
    return None


def configure() -> None:
    # CLOUDINARY_URL (cloudinary://key:secret@cloud) is picked up automatically.
    if os.environ.get("CLOUDINARY_URL"):
        cloudinary.config()
    else:
        cloudinary.config(
            cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME") or cloud_name_from_env_file(),
            api_key=os.environ.get("CLOUDINARY_API_KEY"),
            api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
            secure=True,
        )

    cfg = cloudinary.config()
    missing = [
        name
        for name, val in (
            ("cloud_name", cfg.cloud_name),
            ("api_key", cfg.api_key),
            ("api_secret", cfg.api_secret),
        )
        if not val
    ]
    if missing:
        sys.exit(
            "Missing Cloudinary credentials: "
            + ", ".join(missing)
            + "\nSet CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>)\n"
            "or CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET environment variables.\n"
            "Find them in Cloudinary Console -> Settings -> API Keys."
        )
    print(f"Cloud: {cfg.cloud_name}")


def iter_resources(resource_type: str):
    cursor = None
    while True:
        resp = cloudinary.api.resources(
            resource_type=resource_type,
            type="upload",
            max_results=PAGE_SIZE,
            next_cursor=cursor,
        )
        yield from resp.get("resources", [])
        cursor = resp.get("next_cursor")
        if not cursor:
            break


def local_path_for(resource_type: str, res: dict) -> Path:
    public_id = res["public_id"]
    fmt = res.get("format")
    rel = f"{public_id}.{fmt}" if fmt else public_id
    return DEST / resource_type / rel


def download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        tmp = target.with_suffix(target.suffix + ".part")
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                if chunk:
                    f.write(chunk)
        tmp.replace(target)


def main() -> None:
    configure()
    DEST.mkdir(parents=True, exist_ok=True)

    total = downloaded = skipped = failed = 0
    for rtype in RESOURCE_TYPES:
        print(f"\n== {rtype} ==")
        for res in iter_resources(rtype):
            total += 1
            target = local_path_for(rtype, res)
            if target.exists():
                skipped += 1
                continue
            url = res.get("secure_url") or res.get("url")
            if not url:
                print(f"  ! no url: {res.get('public_id')}")
                failed += 1
                continue
            try:
                download(url, target)
                downloaded += 1
                print(f"  + {target.relative_to(DEST)}")
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"  ! failed {res.get('public_id')}: {e}")

    print(
        f"\nDone. total={total} downloaded={downloaded} "
        f"skipped(existing)={skipped} failed={failed}"
    )
    print(f"Saved to: {DEST}")


if __name__ == "__main__":
    main()
