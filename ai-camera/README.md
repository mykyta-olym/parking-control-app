# AI Camera service (Dockerized)

Container for `scan.py` that pulls camera snapshots, counts vehicles with YOLO and sends data to the backend.

## Quick start
1. Copy env:
   ```bash
   cp .env.example .env
   # set API_URL and API_KEY
   ```
2. Place YOLO weights where `cameras_config.json` expects them (default `yolov8x.pt` in this folder), or change `model_path` in the config to point to your file.
3. Adjust `cameras_config.json` / mask images if needed.
4. Build and run:
   ```bash
   docker compose -f ai-camera/docker-compose.yml --env-file ai-camera/.env up --build
   ```

The container loops every 5 minutes (see `scan.py`). Logs show detected vehicles and POST status.

## Volumes and overrides
- `cameras_config.json`, `mask1.png`, `mask2.png` are bind-mounted so you can edit without rebuild.
- To avoid re-downloading weights, uncomment the weight volume in `docker-compose.yml` and mount your `yolov8x.pt` (or a `weights/` directory).
- `API_URL` defaults to `http://backend:8000/...` so it works with the backend service name if you run both via Docker.
- The Dockerfile pins `PIP_INDEX_URL` to the CPU PyTorch wheel index to skip heavy CUDA deps in CI. If you need GPU builds, override `PIP_INDEX_URL`/`PIP_EXTRA_INDEX_URL` at build time.
