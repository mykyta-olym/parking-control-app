# Smart City Parking Control System (`parking-control-app`)

End-to-end smart parking management and enforcement platform combining an **AI license-plate recognition camera pipeline**, a **Python REST backend**, and a **React Native / TypeScript mobile & web frontend**.

## Architecture

- **`ai-camera/`** — Computer vision edge service in Python using **Ultralytics YOLOv8** and **EasyOCR** / OpenCV to detect vehicles, crop license plates from video streams or snapshots, and push recognized plate events to the backend API.
- **`backend/`** — Python backend service managing parking zones, active parking sessions, vehicle registration, camera event ingestion, tariff calculation, and violation alerts. Includes Dockerfile and deployment manifests (`backend/deploy/`).
- **`Frontend/`** — Cross-platform React Native (Expo) + TypeScript client for drivers and parking inspectors, featuring interactive zone maps, active session timers, license plate management, and payment flows.

## Tech Stack

- **AI / Edge Vision**: Python, OpenCV, PyTorch, Ultralytics YOLO, EasyOCR
- **Backend & Infrastructure**: Python, REST API, PostgreSQL / SQLite, Docker Compose
- **Mobile / Web Client**: TypeScript, React Native, Expo

## Getting Started

### Full Stack via Docker Compose

```sh
cp backend/.env.example backend/.env
cp ai-camera/.env.example ai-camera/.env
docker compose up --build
```

### Frontend Development

```sh
cd Frontend
npm install
npx expo start
```

## License

[MIT](LICENSE)
