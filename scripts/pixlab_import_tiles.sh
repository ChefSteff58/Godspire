#!/bin/bash
# pixlab_import_tiles.sh <set> <tileset_id> — download a finished PixelLab topdown Wang tileset and
# drop its 16 tiles into the sprite folder as tile_<set>_<mask>.png, where <mask> is OUR corner mask
# (NW=8, NE=4, SE=2, SW=1; a corner bit is set when that corner is the UPPER terrain).
#
# The tileset METADATA names each tile's corner terrains + its bounding box in the 128×128 sheet, so
# we slice by metadata instead of trusting any file order — WANG_TILE_FOR_MASK in
# src/game/render/wang.ts stays the identity mapping FOREVER (self-verifying import).
set -e
SET="$1"; ID="$2"
[ -z "$SET" ] || [ -z "$ID" ] && { echo "usage: pixlab_import_tiles.sh <set> <tileset_id>"; exit 2; }
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPR="$ROOT_DIR/src/game/assets/sprites"
TMP=$(mktemp -d)

curl -sfL "https://api.pixellab.ai/mcp/tilesets/$ID/image" -o "$TMP/sheet.png" || {
  echo "sheet download failed — is the tileset finished? (get_topdown_tileset for status)"; exit 1; }
curl -sfL "https://api.pixellab.ai/mcp/tilesets/$ID/metadata" -o "$TMP/meta.json" || {
  echo "metadata download failed"; exit 1; }

python3 - "$TMP" "$SPR" "$SET" << 'PY'
import json, sys
from PIL import Image

tmp, spr, name = sys.argv[1], sys.argv[2], sys.argv[3]
meta = json.load(open(f"{tmp}/meta.json"))
sheet = Image.open(f"{tmp}/sheet.png").convert("RGBA")
tiles = meta["tileset_data"]["tiles"]
assert len(tiles) == 16, f"expected 16 tiles, metadata has {len(tiles)} (23 = transition_size 1.0 — regenerate with 0.25)"

seen = set()
for t in tiles:
    c = t["corners"]
    mask = (8 if c["NW"] == "upper" else 0) | (4 if c["NE"] == "upper" else 0) | \
           (2 if c["SE"] == "upper" else 0) | (1 if c["SW"] == "upper" else 0)
    assert mask not in seen, f"duplicate corner mask {mask} in metadata"
    seen.add(mask)
    b = t["bounding_box"]
    tile = sheet.crop((b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))
    tile.save(f"{spr}/tile_{name}_{mask}.png")

assert seen == set(range(16)), f"masks are not a full 0..15 set: {sorted(seen)}"
print(f"{name}: imported 16 tiles by metadata -> sprites/tile_{name}_{{0..15}}.png (mask-indexed, identity remap)")
PY
rm -rf "$TMP"
