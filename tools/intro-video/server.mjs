// Tiny local render server: serves the animation page + Ping images, and
// receives rendered frames (JPEG) and the music track (WAV) from the browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PING = process.argv[2];
const OUT = path.join(ROOT, 'frames');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.js': 'text/javascript' };

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (url.pathname === '/frame') fs.writeFileSync(path.join(OUT, `f${String(url.searchParams.get('n')).padStart(5, '0')}.jpg`), buf);
        else if (url.pathname === '/audio') fs.writeFileSync(path.join(ROOT, 'music.wav'), buf);
        else if (url.pathname === '/done') fs.writeFileSync(path.join(ROOT, 'done.txt'), buf);
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
        res.end('ok');
      });
      return;
    }
    let file = url.pathname === '/' ? path.join(ROOT, 'intro.html') : url.pathname.startsWith('/ping/') ? path.join(PING, path.basename(url.pathname)) : path.join(ROOT, path.basename(url.pathname));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(5190, () => console.log('render server on http://localhost:5190'));
