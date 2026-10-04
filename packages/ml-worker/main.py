"""Image-processing worker for DesignHub: background removal, object segmentation and inpainting.

Run with:  uvicorn main:app --port 8090
Models download on first use (rembg's U2-Net, and FastSAM weights through ultralytics).
"""
import base64
import io
import logging
from functools import lru_cache

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from PIL import Image

log = logging.getLogger("ml-worker")
app = FastAPI(title="DesignHub ML worker")

MAX_SIDE = 2048


def read_image(upload: UploadFile) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(upload.file.read())).convert("RGBA")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, "Not a readable image") from exc
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE))
    return img


def to_png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@lru_cache(maxsize=1)
def rembg_session():
    from rembg import new_session

    return new_session("u2net")


@lru_cache(maxsize=1)
def fastsam():
    from ultralytics import FastSAM

    return FastSAM("FastSAM-s.pt")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/remove-background")
def remove_background(image: UploadFile = File(...)):
    from rembg import remove

    out = remove(read_image(image), session=rembg_session())
    return Response(to_png(out), media_type="image/png")


@app.post("/segment")
def segment(image: UploadFile = File(...), max_segments: int = Query(8, ge=1, le=12)):
    """Detects objects, returns each as a transparent cut-out plus the picture with those objects painted out."""
    img = read_image(image)
    rgb = np.array(img.convert("RGB"))
    h, w = rgb.shape[:2]
    result = fastsam()(rgb, device="cpu", retina_masks=True, imgsz=640, conf=0.4, iou=0.9, verbose=False)[0]
    if result.masks is None:
        return {"width": w, "height": h, "segments": [], "background": None}

    masks = result.masks.data.cpu().numpy()
    scores = result.boxes.conf.cpu().numpy()
    order = np.argsort(-(masks.reshape(len(masks), -1).sum(axis=1)))  # largest first
    kept, union = [], np.zeros((h, w), dtype=bool)
    for i in order:
        m = cv2.resize(masks[i].astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST).astype(bool)
        area = m.sum()
        if area < 0.005 * w * h or area > 0.85 * w * h:
            continue
        if (m & union).sum() > 0.6 * area:
            continue
        kept.append((m, float(scores[i])))
        union |= m
        if len(kept) >= max_segments:
            break

    rgba = np.array(img)
    segments = []
    for m, score in kept:
        ys, xs = np.where(m)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        cut = rgba.copy()
        cut[..., 3] = np.where(m, cut[..., 3], 0)
        crop = Image.fromarray(cut[y0:y1, x0:x1])
        segments.append({"bbox": [x0, y0, x1 - x0, y1 - y0], "score": score, "cutout": base64.b64encode(to_png(crop)).decode()})

    background = None
    if kept:
        dilated = cv2.dilate(union.astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
        filled = cv2.inpaint(rgb, dilated, 5, cv2.INPAINT_TELEA)
        background = base64.b64encode(to_png(Image.fromarray(filled))).decode()
    return {"width": w, "height": h, "segments": segments, "background": background}


@app.post("/inpaint")
def inpaint(image: UploadFile = File(...), mask: UploadFile = File(...)):
    img = read_image(image).convert("RGB")
    m = np.array(Image.open(io.BytesIO(mask.file.read())).convert("L").resize(img.size))
    out = cv2.inpaint(np.array(img), (m > 127).astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
    return Response(to_png(Image.fromarray(out)), media_type="image/png")
