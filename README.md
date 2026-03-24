# AI-Powered Secure Web Application for Threat Detection

A complete, production-ready **Hybrid Intrusion Detection System (IDS)** built on top of the AirStreem video-meeting platform.

---

## 🚀 How to Run

Choose the method that works best for you:

| Method | Best for | Time to start |
|--------|----------|---------------|
| [Option A — Docker Compose](#option-a--docker-compose-recommended) | Anyone — one command | ~3 min first run |
| [Option B — Manual (local)](#option-b--manual-local-setup) | Development / debugging | ~10 min |

---

### Option A — Docker Compose (Recommended)

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker + Compose)

```bash
# 1. Clone the repository
git clone https://github.com/AvinashKachchawa393/VideoStream.git
cd VideoStream

# 2. Start every service in one command
docker compose up --build
```

That’s it. When all services are healthy you’ll see:

| Service | URL |
|---------|-----|
| 🖥️  React Dashboard | http://localhost:5173 |
| 🛡️  IDS Dashboard | http://localhost:5173/ids |
| ⚙️  Node.js API | http://localhost:8000 |
| 🤖  ML / AI API | http://localhost:5001/health |
| 🗄️  MongoDB | localhost:27017 |

To stop all services:
```bash
docker compose down
```

---

### Option B — Manual (Local Setup)

#### Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Node.js ≥ 18 | ✅ | https://nodejs.org |
| Python ≥ 3.10 | ✅ | https://python.org |
| MongoDB ≥ 6 | ✅ | https://www.mongodb.com/try/download/community |
| Git | ✅ | https://git-scm.com |
| Apache Kafka ≥ 3 | ⬜ optional | https://kafka.apache.org/downloads |

---

#### Step 1 — Clone the repository

```bash
git clone https://github.com/AvinashKachchawa393/VideoStream.git
cd VideoStream
```

---

#### Step 2 — Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Open backend/.env and set your MONGO_URI (see below)

# Frontend (optional — defaults point to localhost:8000)
cp frontend/.env.example frontend/.env
```

Key variable in `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/videostream-ids
ML_API_URL=http://localhost:5001
```

---

#### Step 3 — Install dependencies

**All at once (from the repo root):**
```bash
npm run install:all
```

**Or manually, service by service:**
```bash
npm install               # root tooling (concurrently)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd ml_model && pip install -r requirements.txt && cd ..
```

---

#### Step 4 — Start the services

Open **four terminal windows / tabs** and run one command in each:

**Terminal 1 — MongoDB** *(skip if already running)*
```bash
# macOS / Linux
mongod --dbpath ~/data/db

# Windows (adjust path to your MongoDB installation)
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

**Terminal 2 — Backend (Node.js)**
```bash
cd backend
npm run dev
# ✅ Server running on http://localhost:8000
```

**Terminal 3 — ML / AI API (Python)**
```bash
cd ml_model

# Optional: pre-train models before starting the server
python train.py --samples 5000 --epochs 20

# Start the Flask API (auto-trains on first boot if no saved models exist)
python api_server.py
# ✅ ML API running on http://localhost:5001
```

**Terminal 4 — Frontend (React)**
```bash
cd frontend
npm run dev
# ✅ Frontend running on http://localhost:5173
```

---

#### Step 5 — Open the app

| Page | URL |
|------|-----|
| 🏠 Landing page | http://localhost:5173 |
| 🔒 Register / Login | http://localhost:5173/auth |
| 🏡 Home (video calls) | http://localhost:5173/home |
| 🛡️ IDS Dashboard | http://localhost:5173/ids |

Click **“Simulate Traffic Event”** on the IDS Dashboard to immediately see a live prediction, alert, and blockchain record.

---

#### Shortcut — start backend + frontend together

From the **repo root** (requires MongoDB and the Python ML API to already be running):

```bash
npm run dev
# Starts backend (port 8000) + frontend (port 5173) side-by-side
```

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongoNetworkError` | Start MongoDB: `mongod --dbpath ~/data/db` |
| `ML API unreachable` | Run `python api_server.py` inside `ml_model/` |
| Port already in use | Change `PORT=` in `backend/.env`; for Vite use `npm run dev -- --port 3000` |
| `npm ERR! missing script` | Run `npm install` inside `backend/` or `frontend/` first |
| `ModuleNotFoundError` (Python) | Run `pip install -r ml_model/requirements.txt` |
| Frontend shows blank page | Open browser devtools; confirm the backend is reachable on port 8000 |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Dashboard · Alert Table · XAI (LIME/SHAP) · Blockchain Audit   │
└───────────────────────────⬂───────────────────────────────────┘
                            │ REST + Socket.IO
┌───────────────────────────▼───────────────────────────────────┐
│                   Backend (Node.js / Express)                    │
│   /api/v1/ids/*  →  IDS Routes  →  IDS Controller               │
│   MongoDB (Alert + BlockchainRecord models)                      │
│   Socket.IO real-time alerts                                     │
└─────────────┬───────────────────────────┬───────────────────────┘
              │ HTTP                       │ Simulated Kafka events
┌─────────────▼───────────┐  ┌──────────▼───────────────────────┐
│   Python ML API (Flask)   │  │   Apache Kafka (optional)        │
│   POST /predict           │  │   Topic: network-traffic         │
│   POST /explain/lime      │  │   kafka_consumer.py              │
│   POST /explain/shap      │  └─────────────────────────────────┘
│   GET  /explain/shap/global│
└─────────────┬───────────┘
┌─────────────▼─────────────────────────────────────┐
│                     ML Model Pipeline                          │
│  ┌─────────┐  ┌──────────────────────────┐  ┌───────────┐  │
│  │ PCA     │→ │ CNN + LSTM (deep feats)  │→ │ Random      │  │
│  │ SMOTE   │  │ feature extraction       │  │ Forest      │  │
│  └─────────┘  └──────────────────────────┘  └───────────┘  │
│  ┌──────────────────────────┐                                  │
│  │ LSTM Autoencoder          │  ← Zero-day / anomaly detect.  │
│  └──────────────────────────┘                                  │
│  ┌──────────┐  ┌──────────┐                                    │
│  │   LIME   │  │   SHAP   │  ← Explainable AI                 │
│  └──────────┘  └──────────┘                                    │
└───────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│              Blockchain (Ethereum / AlertRegistry.sol)           │
│  Immutable alert records · SHA-256 / keccak256 data hashing     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
VideoStream/
├── backend/
│   ├── .env.example                    # ← copy to .env and fill in values
│   ├── Dockerfile
│   └── src/
│       ├── app.js                          # Express server entry point
│       ├── controllers/
│       │   ├── ids.controller.js           # IDS REST API handlers
│       │   ├── socketManager.js            # Socket.IO (real-time alerts)
│       │   └── user.controller.js
│       ├── models/
│       │   ├── alert.model.js              # Mongoose Alert schema
│       │   ├── blockchain.model.js         # Blockchain record schema
│       │   ├── meeting.model.js
│       │   └── user.model.js
│       └── routes/
│           ├── ids.routes.js               # /api/v1/ids/* routes
│           └── user.routes.js
│
├── frontend/
│   ├── .env.example                    # ← copy to .env (optional)
│   ├── Dockerfile
│   └── src/
│       ├── components/ids/
│       │   ├── AlertTable.jsx              # Paginated alert log
│       │   ├── MetricsPanel.jsx            # Accuracy / FAR / distribution
│       │   ├── TrafficChart.jsx            # Real-time canvas chart
│       │   └── XAIExplanation.jsx          # LIME + SHAP visualisation
│       ├── pages/
│       │   ├── IDSDashboard.jsx            # Main IDS dashboard page
│       │   └── ...                         # Existing VideoStream pages
│       └── utils/
│           └── idsApi.js                   # Axios IDS API client
│
├── ml_model/
│   ├── Dockerfile
│   ├── api_server.py                   # Flask REST API for ML
│   ├── autoencoder.py                  # LSTM Autoencoder (anomaly)
│   ├── kafka_consumer.py               # Kafka integration
│   ├── model.py                        # Hybrid CNN+LSTM+RF model
│   ├── preprocessing.py                # PCA + SMOTE pipeline
│   ├── requirements.txt                # Python dependencies
│   ├── train.py                        # Training entry point
│   └── xai.py                          # LIME + SHAP explainers
│
├── blockchain/
│   ├── contracts/
│   │   └── AlertRegistry.sol           # Solidity smart contract
│   ├── scripts/
│   │   └── deploy.js                   # Hardhat deployment script
│   ├── hardhat.config.js
│   └── package.json
│
├── docker-compose.yml              # ← one-command startup
├── package.json                    # root scripts (npm run dev / install:all)
└── README.md
```

---

## 🔌 REST API Reference

### IDS Endpoints — `/api/v1/ids`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ingest` | Ingest a raw traffic event and get a prediction |
| POST | `/predict` | Get prediction without storing |
| GET | `/alerts` | List alerts (pagination, filtering) |
| GET | `/alerts/:id` | Get a single alert with blockchain record |
| PATCH | `/alerts/:id` | Update alert status |
| GET | `/stats` | Dashboard statistics |
| POST | `/explain/lime` | LIME explanation for features |
| POST | `/explain/shap` | SHAP local explanation |
| GET | `/explain/shap/global` | SHAP global feature importances |

#### Example: Ingest traffic

```bash
curl -X POST http://localhost:8000/api/v1/ids/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "duration": 45.2,
      "src_bytes": 52000,
      "dst_bytes": 1200,
      "count": 480,
      "srv_count": 240,
      "serror_rate": 0.95,
      "rerror_rate": 0.0,
      "same_srv_rate": 1.0,
      "diff_srv_rate": 0.0
    },
    "metadata": {
      "src_ip": "192.168.1.100",
      "dst_ip": "10.0.0.1",
      "src_port": 54321,
      "dst_port": 80,
      "protocol": "TCP"
    }
  }'
```

Expected response:
```json
{
  "alertId": "uuid-here",
  "prediction": {
    "predicted_class": "DDoS",
    "confidence": 0.923,
    "is_anomaly": true,
    "reconstruction_error": 0.0412
  },
  "severity": "critical"
}
```

---

## 🤖 ML Model Details

### Hybrid Architecture

```
Input Features (41 columns)
       ↓
  PCA (n=20 components)     ← Dimensionality reduction
       ↓
  SMOTE / KMeans-SMOTE      ← Class imbalance handling
       ↓
  CNN (Conv1D × 2)          ← Spatial pattern extraction
       ↓
  LSTM (128 → 64 units)     ← Temporal pattern modelling
       ↓
  Dense (64 units)          ← Deep feature representation
       ↓
  Random Forest (200 trees) ← Final classification
       ↓
  Output: Attack class + probabilities
```

### LSTM Autoencoder (Zero-Day Detection)

Trained exclusively on **benign traffic**. High reconstruction error → anomaly flag.
Threshold set at the 95th percentile of benign reconstruction errors.

### Attack Classes

| Class | Description |
|-------|-------------|
| BENIGN | Normal network traffic |
| DDoS | Distributed Denial of Service |
| SQL_Injection | SQL injection attempts |
| PortScan | Network port scanning |
| BruteForce | Credential brute-force attacks |
| Zero_Day | Unknown / anomalous traffic |

---

## 🔍 Explainable AI

### LIME (Local Interpretable Model-agnostic Explanations)
Provides **per-prediction** feature importance weights showing which network features most influenced the classification decision.

### SHAP (SHapley Additive exPlanations)
Uses `TreeExplainer` on the Random Forest to provide both:
- **Local**: which features pushed the decision for a specific alert
- **Global**: which deep features are most important across all predictions

---

## ⛓️ Blockchain Integration

The `AlertRegistry.sol` smart contract provides:
- **Immutable recording** of every threat alert with `recordAlert()`
- **Data integrity verification** via keccak256 payload hashes
- **Access control** — only whitelisted IDS nodes can write
- **Audit trail** — public read access for compliance

### Optional: Deploy to local Hardhat node

```bash
cd blockchain
npm install

# Terminal A — local chain
npm run node

# Terminal B — deploy
npm run deploy:local
```

To deploy to Sepolia testnet, set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `blockchain/.env` and run:
```bash
npm run deploy:sepolia
```

---

## 📊 Performance Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Accuracy | > 95% | Correct attack classifications |
| False Alarm Rate (FAR) | < 5% | False positives as % of benign |
| Latency | < 200ms | End-to-end prediction time |
| Throughput | > 1000 EPS | Events per second (Kafka mode) |

---

## 🧪 Testing Guide

### Quick smoke test (no services needed)
```bash
cd ml_model
python -c "
from preprocessing import generate_synthetic_dataset, DataPreprocessor
from model import HybridIDSModel
from sklearn.model_selection import train_test_split

df = generate_synthetic_dataset(500)
pre = DataPreprocessor(n_components=10)
X, y = pre.fit_transform(df)
model = HybridIDSModel(input_dim=10)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2)
model.train(X_tr, y_tr, epochs=2)
m = model.evaluate(X_te, y_te, list(pre.label_encoder.classes_))
print('Accuracy:', m['accuracy'])
"
```

### Test the ML REST API
```bash
# Health check
curl http://localhost:5001/health

# Prediction
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"src_bytes": 50000, "count": 500}}'
```

### Test the IDS backend
```bash
# Send 10 simulated traffic events
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:8000/api/v1/ids/ingest \
    -H "Content-Type: application/json" \
    -d '{"features":{"src_bytes":50000,"count":500},"metadata":{"src_ip":"1.2.3.4"}}' | \
    python -m json.tool
done

# View dashboard stats
curl http://localhost:8000/api/v1/ids/stats | python -m json.tool
```

---

## 🔒 Security Considerations

- All MongoDB queries use Mongoose schemas with strict validation
- Input features are validated before passing to the ML API
- Blockchain records use SHA-256 / keccak256 for tamper detection
- Smart contract uses `onlyAuthorized` modifier for write access
- Source IPs can be hashed before blockchain storage for GDPR compliance
- All IDS write endpoints are rate-limited (`express-rate-limit`)

---

## 📈 Dashboard Features

Navigate to **http://localhost:5173/ids** for:

1. **📊 Dashboard** — Real-time rolling traffic chart + attack/severity metrics
2. **🚨 Alerts** — Paginated alert log with filtering and status management
3. **🔍 XAI** — LIME + SHAP explanations for any selected alert
4. **⛓️ Blockchain** — Audit trail of all immutably recorded threat events

Real-time alerts are delivered via **Socket.IO** (no page refresh needed).
