#!/bin/sh
# Generates public/voice/<key>.mp3 for every line in lines.tsv (skips ones that already exist).
# Needs the edge-tts Python package (pip install edge-tts). EDGE_TTS = path to the edge-tts executable.
cd "$(dirname "$0")/../.."
EDGE_TTS="${EDGE_TTS:-edge-tts}"
gen() {
  key="$1"; voice="$2"; text="$3"
  [ -s "public/voice/$key.mp3" ] && return 0
  if [ "$voice" = "he-IL-AvriNeural" ]; then extra="--rate=+8% --pitch=-6Hz"; else extra="--rate=+4% --pitch=+2Hz"; fi
  "$EDGE_TTS" --voice "$voice" $extra --text "$text" --write-media "public/voice/$key.mp3" >/dev/null 2>&1 || echo "FAILED $key"
}
export -f gen 2>/dev/null
while IFS="$(printf '\t')" read -r key voice text; do
  gen "$key" "$voice" "$text" &
  while [ "$(jobs -r | wc -l)" -ge 6 ]; do sleep 0.2; done
done < tools/narration/lines.tsv
wait
echo "done: $(ls public/voice/*.mp3 | wc -l) files"
