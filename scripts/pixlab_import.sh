#!/bin/bash
# pixlab_import.sh <key> <charid> — download a finished PixelLab character's zip (public, no auth)
# and drop its rotations + animations into the sprite folder under our naming convention:
#   rotation:  <key>_<dir>.png            (+ a base <key>.png copied from south, used as shop icon / fallback)
#   animation: <key>_<anim>_<dir>_<N>.png (anim folder mapped: *fire/cast/throw/punch* → attack, *walk/run* → walk)
# The renderer (src/game/render/DirAnimSprite.ts) + the manifest glob auto-pick these up — no code per creature.
set -e
KEY="$1"; ID="$2"; ANIM_OVERRIDE="$3" # optional 3rd arg forces the anim name (e.g. attack/walk), bypassing the folder heuristic
[ -z "$KEY" ] || [ -z "$ID" ] && { echo "usage: pixlab_import.sh <key> <charid> [anim-name]"; exit 2; }
SPR="$(cd "$(dirname "$0")/.." && pwd)/src/game/assets/sprites"
TMP=$(mktemp -d)
curl -sf "https://api.pixellab.ai/mcp/characters/$ID/download" -o "$TMP/c.zip"
unzip -q "$TMP/c.zip" -d "$TMP/x"
ROOT=$(find "$TMP/x" -maxdepth 1 -mindepth 1 -type d | head -1)
for f in "$ROOT"/rotations/*.png; do
  [ -e "$f" ] || continue
  d=$(basename "$f" .png)
  cp "$f" "$SPR/${KEY}_${d}.png"
  [ "$d" = "south" ] && cp "$f" "$SPR/${KEY}.png"
done
for adir in "$ROOT"/animations/*/; do
  [ -d "$adir" ] || continue
  if [ -n "$ANIM_OVERRIDE" ]; then
    anim="$ANIM_OVERRIDE"
  else
    lc=$(basename "$adir" | tr 'A-Z' 'a-z')
    case "$lc" in
      *walk*|*run*) anim=walk;;
      *fire*|*cast*|*throw*|*punch*|*attack*|*kick*|*harvest*|*pick*|*animat*) anim=attack;;
      *) anim="$lc";;
    esac
  fi
  for fr in "$adir"*/; do
    [ -d "$fr" ] || continue
    dir=$(basename "$fr")
    for png in "$fr"frame_*.png; do
      [ -e "$png" ] || continue
      num=$(basename "$png" .png | sed 's/frame_0*//'); num=${num:-0}
      cp "$png" "$SPR/${KEY}_${anim}_${dir}_${num}.png"
    done
  done
done
echo "$KEY: imported $(ls "$SPR/${KEY}"_*.png 2>/dev/null | wc -l | tr -d ' ') files"
rm -rf "$TMP"
