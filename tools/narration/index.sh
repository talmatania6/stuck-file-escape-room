#!/bin/sh
# Writes public/voice/index.json: { "<key>": seconds } for every clip (used to time bubbles and Ping's mouth).
cd "$(dirname "$0")/../.."
{
  echo "{"
  first=1
  for f in public/voice/*.mp3; do
    k=$(basename "$f" .mp3)
    d=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f")
    [ $first -eq 1 ] || echo ","
    printf '"%s":%.2f' "$k" "$d"
    first=0
  done
  echo
  echo "}"
} > public/voice/index.json
echo "index: $(grep -c '"' public/voice/index.json) clips"
