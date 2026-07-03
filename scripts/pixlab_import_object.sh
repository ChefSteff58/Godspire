#!/bin/bash
# pixlab_import_object.sh <key> <object_id> — download a finished PixelLab map object (a single
# transparent PNG) into the sprite folder as obj_<key>.png (or any exact <key> you pass with a
# prefix already applied). Map objects auto-delete after 8 hours — import immediately on approval.
set -e
KEY="$1"; ID="$2"
[ -z "$KEY" ] || [ -z "$ID" ] && { echo "usage: pixlab_import_object.sh <key> <object_id>"; exit 2; }
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPR="$ROOT_DIR/src/game/assets/sprites"
OUT="$SPR/${KEY}.png"
curl -sfL "https://api.pixellab.ai/mcp/map-objects/$ID/download" -o "$OUT" || {
  echo "download failed — finished? (get_map_object) expired? (8h auto-delete)"; exit 1; }
file "$OUT" | grep -q "PNG image" || { echo "payload is not a PNG:"; file "$OUT"; rm -f "$OUT"; exit 1; }
echo "$KEY: imported → sprites/${KEY}.png ($(file -b "$OUT" | cut -d, -f2 | tr -d ' '))"
