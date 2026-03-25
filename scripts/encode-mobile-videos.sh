#!/usr/bin/env bash
# Re-encode hero / background MP4s for phones (H.264, faststart, no audio).
# Mobile: up to 1280px wide, CRF 17 — noticeably sharper than older 1080/CRF19 passes.
#
# Optional — slightly smaller desktop Barbican (backup first, then):
#   BARBICAN_DESKTOP_CRF=22 ./scripts/encode-mobile-videos.sh
#
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
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow \
    -movflags +faststart \
    -an \
    "$dst"
done

BARBICAN_DESKTOP_CRF="${BARBICAN_DESKTOP_CRF:-}"
if [[ -n "$BARBICAN_DESKTOP_CRF" && -f public/barbican.mp4 ]]; then
  tmp="public/barbican-desktop-encode.tmp.mp4"
  echo "Re-encoding desktop public/barbican.mp4 (CRF ${BARBICAN_DESKTOP_CRF}) → ${tmp}, replace manually after review"
  "$FFMPEG" -y -i public/barbican.mp4 \
    -c:v libx264 -pix_fmt yuv420p -crf "$BARBICAN_DESKTOP_CRF" -preset slow \
    -movflags +faststart \
    -an \
    "$tmp"
  echo "Done desktop pass: mv $tmp public/barbican.mp4 (after backup)"
fi

echo "Done."
