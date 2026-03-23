#!/usr/bin/env bash
# Re-encode hero / background MP4s for phones (1080px wide, high quality H.264, faststart, no audio).
# Requires: ffmpeg (brew install ffmpeg)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FFMPEG="${FFMPEG:-ffmpeg}"
if ! command -v "$FFMPEG" >/dev/null 2>&1; then
  echo "ffmpeg not found. Install: brew install ffmpeg" >&2
  exit 1
fi
for name in istanbul barbican; do
  src="public/${name}.mp4"
  dst="public/${name}-mobile.mp4"
  if [[ ! -f "$src" ]]; then
    echo "Skip (missing): $src" >&2
    continue
  fi
  echo "Encoding $dst ..."
  "$FFMPEG" -y -i "$src" \
    -vf "scale='min(1080,iw)':-2" \
    -c:v libx264 -pix_fmt yuv420p -crf 19 -preset slow \
    -movflags +faststart \
    -an \
    "$dst"
done
echo "Done."
