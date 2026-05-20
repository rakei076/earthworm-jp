#!/usr/bin/env python3
"""
Pre-generate MP3 audio files for every Japanese sentence using Microsoft
Edge's neural TTS (free, no API key).

For each statement JSON in data/courses/*.json, we:
  1. Read the `japanese` field.
  2. Compute a stable file name from sha256(japanese)[:16].
  3. Generate MP3 with edge-tts → apps/client/public/audio/{hash}.mp3.
  4. Skip files that already exist (idempotent / resumable).
  5. Inject an `audioPath` field back into the JSON so seed.ts can copy
     it into the database.

Voice: ja-JP-NanamiNeural (female, polite-neutral, very clear).
"""

import asyncio
import hashlib
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
COURSES_DIR = ROOT / "data" / "courses"
AUDIO_OUT_DIR = ROOT.parents[1] / "apps" / "client" / "public" / "audio"
VOICE = "ja-JP-NanamiNeural"
AUDIO_URL_PREFIX = "/audio"

CONCURRENCY = 6  # parallel edge-tts requests

def hash_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


async def synth(text: str, out: Path) -> None:
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(str(out))


async def synth_with_retry(text: str, out: Path, tries: int = 3) -> bool:
    for attempt in range(1, tries + 1):
        try:
            await synth(text, out)
            return True
        except Exception as e:
            if attempt == tries:
                print(f"  ✗ {text[:30]}: {e}", file=sys.stderr)
                return False
            await asyncio.sleep(0.5 * attempt)
    return False


async def process_file(json_path: Path, sem: asyncio.Semaphore) -> tuple[int, int]:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    new_count = 0
    skip_count = 0
    tasks = []

    async def one(item):
        nonlocal new_count, skip_count
        japanese = item.get("japanese", "")
        if not japanese:
            return
        h = hash_text(japanese)
        out = AUDIO_OUT_DIR / f"{h}.mp3"
        item["audioPath"] = f"{AUDIO_URL_PREFIX}/{h}.mp3"
        if out.exists() and out.stat().st_size > 0:
            skip_count += 1
            return
        async with sem:
            ok = await synth_with_retry(japanese, out)
            if ok:
                new_count += 1

    for item in data:
        tasks.append(one(item))
    await asyncio.gather(*tasks)

    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return new_count, skip_count


async def main() -> None:
    AUDIO_OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Skip macOS AppleDouble (`._foo.json`) and the metadata index (`_metadata.json`).
    files = sorted(
        p for p in COURSES_DIR.glob("*.json")
        if not p.name.startswith("_") and not p.name.startswith(".")
    )
    print(f"Found {len(files)} course files. Writing MP3s to {AUDIO_OUT_DIR}")
    print(f"Voice: {VOICE}")
    print()
    sem = asyncio.Semaphore(CONCURRENCY)
    total_new = 0
    total_skip = 0
    for f in files:
        new, skip = await process_file(f, sem)
        total_new += new
        total_skip += skip
        print(f"  ✓ {f.name}: {new} new, {skip} cached")
    print(f"\nDone. {total_new} generated, {total_skip} reused.")


if __name__ == "__main__":
    asyncio.run(main())
