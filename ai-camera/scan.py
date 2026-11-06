import json
import time
from datetime import datetime, timezone
from pathlib import Path
import os
from dotenv import load_dotenv
load_dotenv()
import cv2
import numpy as np
import requests
from requests.auth import HTTPDigestAuth
from ultralytics import YOLO

from mask_filter import apply_mask

API_URL = os.getenv("API_URL")
API_KEY = os.getenv("API_KEY")


CONFIG_PATH = Path(__file__).with_name("cameras_config.json")

VEHICLE_CLASSES = {"car", "truck", "motorcycle"}

def load_camera_config(path: Path = CONFIG_PATH):
    if not path.is_file():
        raise FileNotFoundError(f"Config file not found: {path.resolve()}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    cameras = data.get("cameras", [])
    if not cameras:
        raise ValueError("No cameras defined in cameras_config.json")

    return cameras


def load_models(cameras):
    models = {}
    for cam in cameras:
        mpath = cam["model_path"]
        if mpath not in models:
            print(f"Load model {mpath}")
            models[mpath] = YOLO(mpath)
    return models


def get_snapshot(snapshot_url: str, username: str, password: str):
    resp = requests.get(
        snapshot_url,
        auth=HTTPDigestAuth(username, password),
        timeout=10,
    )
    resp.raise_for_status()

    arr = np.frombuffer(resp.content, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError("cv2.imdecode returned None")
    return img


def count_vehicles_on_image(img, model, conf: float):
    results = model(img, conf=conf, verbose=False)[0]
    names = results.names

    vehicle_count = 0

    for box in results.boxes:
        cls_id = int(box.cls[0])
        cls_name = names[cls_id]
        if cls_name not in VEHICLE_CLASSES:
            continue

        vehicle_count += 1

    return vehicle_count


def send_snapshot(zones):
    payload = {"zones": zones}
    try:
        resp = requests.post(
            API_URL,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": API_KEY,
            },
            json=payload,
            timeout=10,
        )
        print(f"API answer: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Error POST: {e}")


def process_camera(cam, models, ts_iso):
    cam_id = cam["id"]
    snapshot_url = cam["snapshot_url"]
    username = cam["username"]
    password = cam["password"]
    model = models[cam["model_path"]]
    conf = cam["conf"]
    mask_path = cam["mask_path"]

    try:
        img = get_snapshot(snapshot_url, username, password)
    except Exception as e:
        print(f"[{cam_id}] Failed to get frame: {e}")
        return None

    try:
        img_masked = apply_mask(img, mask_path)
    except Exception as e:
        print(f"[{cam_id}] Error while applying mask {mask_path}: {e}")
        return None

    vehicle_count = count_vehicles_on_image(img_masked, model, conf)
    print(f"[{cam_id}] detected {vehicle_count} vehicles")

    zone = {
        "zone_id": cam["zone_id"],
        "occupied_spots": vehicle_count,
        "ts": ts_iso,
    }
    return zone


def run_once(models, cameras):
    ts_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    zones = []

    for cam in cameras:
        zone = process_camera(cam, models, ts_iso)
        if zone is not None:
            zones.append(zone)

    if zones:
        send_snapshot(zones)
    else:
        print("No zone data to send.")


def main():
    cameras = load_camera_config()
    models = load_models(cameras)

    while True:
        run_once(models, cameras)
        time.sleep(5 * 60) # 5 minutes


if __name__ == "__main__":
    main()
