# Ping intro video – production files

Output: `public/intro/ping-intro.mp4` (1280x720, 36.6 s, H.264 + AAC, ~6 MB) and `ping-intro-poster.jpg`.

1. **Script** – `lines.tsv` (id, subtitle text, text with niqqud sent to the voice).
2. **Narration** – Microsoft neural voice `he-IL-HilaNeural` via the `edge-tts` Python package:
   `edge-tts --voice he-IL-HilaNeural --rate=+4% --pitch=+2Hz --text "..." --write-media vo/l1.mp3`
3. **Timeline** – `timeline.json`: start time + duration of every line (subtitles and scenes follow it).
4. **Animation, music, SFX** – `intro.html` draws every frame as a function of time (HTML canvas) and
   synthesises the music/effects with the Web Audio API. Preview a moment: `?t=12.5`, play: `?play=1`.
5. **Render** – `node server.mjs <path-to-public/assets/ping>`, open `http://localhost:5190/?render=1`;
   frames go to `frames/`, music to `music.wav`.
6. **Mix + encode** – `sh mix.sh <output-dir>` (ffmpeg: narration over ducked music, loudness -16 LUFS).
