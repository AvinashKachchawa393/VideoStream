# AI-Powered Secure Web Application for Threat Detection

A complete, production-ready **Hybrid Intrusion Detection System (IDS)** built on top of the AirStreem video-meeting platform.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Dashboard · Alert Table · XAI (LIME/SHAP) · Blockchain Audit   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST + Socket.IO
┌───────────────────────────▼─────────────────────────────────────┐
│                   Backend (Node.js / Express)                    │
│   /api/v1/ids/*  →  IDS Routes  →  IDS Controller               │
│   MongoDB (Alert + BlockchainRecord models)                      │
│   Socket.IO real-time alerts                                     │
└─────────────┬───────────────────────────┬───────────────────────┘
              │ HTTP                       │ Simulated Kafka events
┌─────────────▼─────────────┐  ┌──────────▼──────────────────────┐
│   Python ML API (Flask)   │  │   Apache Kafka (optional)        │
│   POST /predict           │  │   Topic: network-traffic         │
│   POST /explain/lime      │  │   kafka_consumer.py              │
│   POST /explain/shap      │  └─────────────────────────────────┘
│   GET  /explain/shap/global│
└─────────────┬─────────────┘
┌─────────────▼─────────────────────────────────────────────────┐
│                     ML Model Pipeline                          │
│  ┌─────────┐  ┌──────────────────────────┐  ┌─────────────┐  │
│  │ PCA     │→ │ CNN + LSTM (deep feats)  │→ │ Random      │  │
│  │ SMOTE   │  │ feature extraction       │  │ Forest      │  │
│  └─────────┘  └──────────────────────────┘  └─────────────┘  │
│  ┌──────────────────────────┐                                  │
│  │ LSTM Autoencoder          │  ← Zero-day / anomaly detect.  │
│  └──────────────────────────┘                                  │
│  ┌──────────┐  ┌──────────┐                                    │
│  │   LIME   │  │   SHAP   │  ← Explainable AI                 │
│  └──────────┘  └──────────┘                                    │
└────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│              Blockchain (Ethereum / AlertRegistry.sol)           │
│  Immutable alert records · SHA-256 / keccak256 data hashing     │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```
VideoStream/
├── backend/
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
│   ├── api_server.py                       # Flask REST API for ML
│   ├── autoencoder.py                      # LSTM Autoencoder (anomaly)
│   ├── kafka_consumer.py                   # Kafka integration
│   ├── model.py                            # Hybrid CNN+LSTM+RF model
│   ├── preprocessing.py                    # PCA + SMOTE pipeline
│   ├── requirements.txt                    # Python dependencies
│   ├── train.py                            # Training entry point
│   └── xai.py                             # LIME + SHAP explainers
│
└── blockchain/
    ├── contracts/
    │   └── AlertRegistry.sol               # Solidity smart contract
    ├── scripts/
    │   └── deploy.js                       # Hardhat deployment script
    ├── hardhat.config.js
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| MongoDB | ≥ 6 |
| Apache Kafka | ≥ 3 (optional) |

---

### 1. Backend (Node.js)

```bash
cd backend
npm install
# Set environment variables
export MONGO_URI="mongodb://localhost:27017/ids"
export ML_API_URL="http://localhost:5001"
npm run dev
# Server starts on http://localhost:8000
```

---

### 2. ML API (Python)

```bash
cd ml_model
pip install -r requirements.txt

# Train models (generates synthetic data if no dataset available)
python train.py --samples 5000 --epochs 20 --pca-components 20

# Start Flask API server
python api_server.py
# API starts on http://localhost:5001
```

To use a real dataset (CICIDS2017, UNSW-NB15, or TON-IoT):
1. Download the dataset and place it in `ml_model/data/`
2. Update `preprocessing.py` → `FEATURE_COLUMNS` to match dataset columns
3. Re-run `python train.py`

---

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173

# Navigate to the IDS Dashboard:
# http://localhost:5173/ids
```

---

### 4. Blockchain (optional)

```bash
cd blockchain
npm install

# Start a local Hardhat node
npm run node

# Deploy the contract (in a new terminal)
npm run deploy:local
```

---

### 5. Apache Kafka (optional)

```bash
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka broker
bin/kafka-server-start.sh config/server.properties

# Create topic
bin/kafka-topics.sh --create --topic network-traffic --bootstrap-server localhost:9092

# The ml_model/kafka_consumer.py will auto-connect when Kafka is running
# Otherwise, it falls back to simulated event generation automatically
```

---

## 🔌 REST API Reference

### IDS Endpoints — `POST /api/v1/ids`

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

In production, deploy to Ethereum Sepolia testnet and set `BLOCKCHAIN_CONTRACT_ADDRESS` in the backend environment.

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

### Unit test the ML model
```bash
cd ml_model
python -c "
from preprocessing import generate_synthetic_dataset, DataPreprocessor
from model import HybridIDSModel
import numpy as np

df = generate_synthetic_dataset(500)
pre = DataPreprocessor(n_components=10)
X, y = pre.fit_transform(df)
model = HybridIDSModel(input_dim=10)
from sklearn.model_selection import train_test_split
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2)
model.train(X_tr, y_tr, epochs=2)
metrics = model.evaluate(X_te, y_te, list(pre.label_encoder.classes_))
print('Accuracy:', metrics['accuracy'])
"
```

### Test the REST API
```bash
# Health check
curl http://localhost:5001/health

# Random prediction
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"src_bytes": 50000, "count": 500}}'
```

### Test the IDS backend
```bash
# Simulate 10 traffic events
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:8000/api/v1/ids/ingest \
    -H "Content-Type: application/json" \
    -d '{"features":{"src_bytes":50000,"count":500},"metadata":{"src_ip":"1.2.3.4"}}' | \
    python -m json.tool
done

# Check stats
curl http://localhost:8000/api/v1/ids/stats | python -m json.tool
```

---

## 🔒 Security Considerations

- All MongoDB queries use Mongoose schemas with strict validation
- Input features are validated before passing to the ML API
- Blockchain records use SHA-256 / keccak256 for tamper detection
- Smart contract uses `onlyAuthorized` modifier for write access
- Source IPs can be hashed before blockchain storage for GDPR compliance
- Rate limiting should be added to `/ingest` in production (`express-rate-limit`)

---

## 📈 Dashboard Features

Navigate to **http://localhost:5173/ids** for:

1. **📊 Dashboard** — Real-time rolling traffic chart + attack/severity metrics
2. **🚨 Alerts** — Paginated alert log with filtering and status management
3. **🔍 XAI** — LIME + SHAP explanations for any selected alert
4. **⛓️ Blockchain** — Audit trail of all immutably recorded threat events

Real-time alerts are delivered via **Socket.IO** (no page refresh needed).
