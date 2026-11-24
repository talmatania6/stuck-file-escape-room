#!/bin/sh
# Assemble the frames + narration + music into the final MP4.
set -e
cd "$(dirname "$0")"
OUT="$1"
mkdir -p "$OUT"
# narration start times (ms) from timeline.json
DELAYS=$(python -c "import json;print(' '.join(str(int(l['start']*1000)) for l in json.load(open('timeline.json',encoding='utf-8'))))")
set -- $DELAYS
ffmpeg -y -v error \
  -framerate 30 -i frames/f%05d.jpg \
  -i music.wav \
  -i vo/l1.mp3 -i vo/l2.mp3 -i vo/l3.mp3 -i vo/l4.mp3 -i vo/l5.mp3 -i vo/l6.mp3 -i vo/l7.mp3 \
  -filter_complex "\
[2:a]adelay=$1|$1[a1];[3:a]adelay=$2|$2[a2];[4:a]adelay=$3|$3[a3];[5:a]adelay=$4|$4[a4];[6:a]adelay=$5|$5[a5];[7:a]adelay=$6|$6[a6];[8:a]adelay=$7|$7[a7];\
[a1][a2][a3][a4][a5][a6][a7]amix=inputs=7:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.15,apad=whole_dur=36.6,asplit=2[vo][key];\
[1:a]volume=0.85[mus];[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];\
[duck][vo]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]" \
  -map 0:v -map "[aout]" \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -shortest \
  "$OUT/ping-intro.mp4"
ffmpeg -y -v error -ss 27.3 -i "$OUT/ping-intro.mp4" -frames:v 1 -q:v 3 "$OUT/ping-intro-poster.jpg"
ls -la "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact "$OUT/ping-intro.mp4"
