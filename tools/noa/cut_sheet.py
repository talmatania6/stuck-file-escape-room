"""Cut Noa's six seated views out of her character sheet (grey studio backdrop).

Usage: python cut_sheet.py <sheet.jpg> <out_dir>
Writes noa-front / left34 / leftprofile / back / rightprofile / right34 .webp with alpha.

How: the backdrop is a smooth grey gradient, so it is estimated per row from empty
columns between the figures; alpha comes from each pixel's distance to that backdrop.
Each crop keeps only the figure+chair connected to a seed point on her body (so a
neighbour's shoe poking into the crop is dropped), and edge colours are un-mixed
from the grey so there is no halo.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W, _ = img.shape
Y1 = 770  # labels (FRONT, LEFT 3/4 …) sit below this line

# backdrop: sample empty columns on every row, interpolate across the width
cols = [(0, 30), (372, 400), (1030, 1052), (1318, 1342), (1975, 2000)]
cx = np.array([(a + b) / 2 for a, b in cols])
samples = np.stack([img[:, a:b].mean(axis=1) for a, b in cols], axis=1)  # H x n x 3
xs = np.arange(W)
bg = np.empty_like(img)
for c in range(3):
    for y in range(H):
        bg[y, :, c] = np.interp(xs, cx, samples[y, :, c])

dist = np.linalg.norm(img - bg, axis=2)
alpha = np.clip((dist - 12.0) / (34.0 - 12.0), 0, 1)  # soft matte: keeps shaded skin solid
strict = dist > 46.0  # only clearly-not-backdrop pixels: decides which shape is Noa (floor shadows fail this)

# each view's centre on the sheet (where its label sits)
VIEWS = [('front', 208), ('left34', 556), ('leftprofile', 896), ('back', 1178), ('rightprofile', 1481), ('right34', 1797)]
centres = np.array([c for _, c in VIEWS])

# where neighbouring figures overlap (their shoes touch), cut the solid mask at the narrowest
# column near the midpoint between their labels, so each shoe stays with its own figure
st_all = strict[:Y1].copy()
mids = (centres[:-1] + centres[1:]) / 2
for m in mids.astype(int):
    lo, hi = m - 70, m + 70
    counts = st_all[:, lo:hi].sum(axis=0)
    cut = lo + int(np.argmin(counts))
    st_all[:, cut] = False

# label every solid shape on the whole sheet once, then give each shape to the nearest view
lab, n = ndimage.label(st_all)
idx = np.arange(1, n + 1)
sizes = ndimage.sum(st_all, lab, idx)
cents = ndimage.center_of_mass(st_all, lab, idx)
owner = np.full(n + 1, -1)
for i, (sz, (cy, cxm)) in enumerate(zip(sizes, cents), start=1):
    if sz >= 40:
        owner[i] = int(np.argmin(np.abs(centres - cxm)))

ERASE = {'left34': [(274, 532, 304, 556)], 'right34': [(0, 512, 46, 600)]}  # boxes in crop pixels

for v, (name, _) in enumerate(VIEWS):
    keep = owner[lab] == v
    # tiny enclosed holes (a shaded bit of skin that reads as grey) become solid
    holes = ndimage.binary_fill_holes(keep) & ~keep
    hl, hn = ndimage.label(holes)
    hs = ndimage.sum(holes, hl, range(1, hn + 1))
    keep = keep | np.isin(hl, [i + 1 for i, val in enumerate(hs) if val < 300])
    ys, xs_ = np.nonzero(keep)
    x0, x1 = max(0, xs_.min() - 6), min(W, xs_.max() + 7)
    keep = keep[:, x0:x1]
    region = ndimage.binary_dilation(keep, iterations=4)
    a = np.maximum(alpha[:Y1, x0:x1], ndimage.binary_erosion(keep, iterations=2)) * region
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32) / 255
    rgb = img[:Y1, x0:x1]
    b = bg[:Y1, x0:x1]
    safe = np.maximum(a, 0.08)[..., None]
    un = np.clip((rgb - (1 - safe) * b) / safe, 0, 255)  # remove the grey mixed into soft edges
    rgba = np.dstack([un, a * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bbox)
    # a neighbour's shoe tip joined to this view through the floor shadow: clear it by hand
    for box in ERASE.get(name, []):
        im.paste((0, 0, 0, 0), box)
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    im.save(OUT / f'noa-{name}.webp', 'WEBP', quality=88, method=6)
    print(name, im.size)
