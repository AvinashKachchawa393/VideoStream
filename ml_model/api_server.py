"""
Flask REST API server exposing the trained Hybrid IDS Model.
Endpoints consumed by the Node.js backend.

Routes
------
POST /predict         - predict attack class for a single feature vector
POST /predict/batch   - predict for multiple samples
GET  /health          - liveness check
GET  /metrics         - model performance metrics
POST /explain/lime    - LIME explanation for a sample
POST /explain/shap    - SHAP explanation for a sample
GET  /explain/shap/global - global SHAP feature importances
"""

import os
import json
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

# ---------------------------------------------------------------------------
# Lazy-loaded globals (populated on first request or at startup)
# ---------------------------------------------------------------------------
_preprocessor = None
_hybrid_model = None
_autoencoder = None
_xai_explainer = None
_class_names = None


def _load_models():
    global _preprocessor, _hybrid_model, _autoencoder, _xai_explainer, _class_names

    if _hybrid_model is not None:
        return  # already loaded

    # Check whether models exist; if not, train them on-the-fly with defaults.
    if not os.path.exists(os.path.join(MODELS_DIR, "random_forest.pkl")):
        logger.info("No saved models found. Running training pipeline …")
        from train import train
        train(n_samples=2000, epochs=5, pca_components=20)

    from preprocessing import DataPreprocessor
    from model import HybridIDSModel
    from autoencoder import LSTMAutoencoder
    from xai import XAIExplainer

    _preprocessor = DataPreprocessor.load(MODELS_DIR)
    _hybrid_model = HybridIDSModel.load(MODELS_DIR)
    _autoencoder = LSTMAutoencoder.load(MODELS_DIR)
    _class_names = list(_preprocessor.label_encoder.classes_)

    # Build XAI explainer using a small background dataset
    from preprocessing import generate_synthetic_dataset
    df_bg = generate_synthetic_dataset(300)
    X_bg = _preprocessor.transform(df_bg)
    feature_names = [f"PC{i+1}" for i in range(X_bg.shape[1])]
    _xai_explainer = XAIExplainer(_hybrid_model, X_bg, feature_names, _class_names)

    logger.info("All models loaded. Classes: %s", _class_names)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _features_from_request() -> np.ndarray:
    """Extract and preprocess features from a JSON request body."""
    body = request.get_json(force=True)
    features = body.get("features", {})
    if not features:
        raise ValueError("Request body must contain a 'features' dict.")
    import pandas as pd
    df = pd.DataFrame([features])
    return _preprocessor.transform(df)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.before_request
def ensure_models():
    _load_models()


@app.get("/health")
def health():
    return jsonify({"status": "ok", "models_loaded": _hybrid_model is not None})


@app.get("/metrics")
def metrics():
    """Return cached evaluation metrics (generated during training)."""
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return jsonify(json.load(f))
    return jsonify({"message": "Metrics not yet computed. Run train.py first."})


@app.post("/predict")
def predict():
    try:
        X = _features_from_request()
        x = X[0]
        class_id, proba = _hybrid_model.predict_single(x)
        is_anomaly, recon_error = _autoencoder.detect_single(x)
        return jsonify({
            "predicted_class": _class_names[class_id],
            "predicted_class_id": class_id,
            "confidence": float(proba[class_id]),
            "probabilities": {_class_names[i]: float(p) for i, p in enumerate(proba)},
            "is_anomaly": bool(is_anomaly),
            "reconstruction_error": float(recon_error),
            "anomaly_threshold": float(_autoencoder.threshold),
        })
    except Exception as exc:
        logger.exception("Prediction error")
        return jsonify({"error": str(exc)}), 400


@app.post("/predict/batch")
def predict_batch():
    try:
        body = request.get_json(force=True)
        samples = body.get("samples", [])
        if not samples:
            return jsonify({"error": "No samples provided"}), 400
        import pandas as pd
        df = pd.DataFrame(samples)
        X = _preprocessor.transform(df)
        predictions = _hybrid_model.predict(X)
        probas = _hybrid_model.predict_proba(X)
        anomaly_flags, recon_errors = _autoencoder.detect(X)
        results = []
        for i, (class_id, proba, is_anomaly, err) in enumerate(
            zip(predictions, probas, anomaly_flags, recon_errors)
        ):
            results.append({
                "index": i,
                "predicted_class": _class_names[int(class_id)],
                "predicted_class_id": int(class_id),
                "confidence": float(proba[int(class_id)]),
                "is_anomaly": bool(is_anomaly),
                "reconstruction_error": float(err),
            })
        return jsonify({"results": results, "count": len(results)})
    except Exception as exc:
        logger.exception("Batch prediction error")
        return jsonify({"error": str(exc)}), 400


@app.post("/explain/lime")
def explain_lime():
    try:
        X = _features_from_request()
        explanation = _xai_explainer.explain_lime(X[0])
        return jsonify(explanation)
    except Exception as exc:
        logger.exception("LIME explanation error")
        return jsonify({"error": str(exc)}), 400


@app.post("/explain/shap")
def explain_shap_local():
    try:
        X = _features_from_request()
        explanation = _xai_explainer.explain_shap_local(X[0])
        return jsonify(explanation)
    except Exception as exc:
        logger.exception("SHAP local explanation error")
        return jsonify({"error": str(exc)}), 400


@app.get("/explain/shap/global")
def explain_shap_global():
    try:
        explanation = _xai_explainer.explain_shap_global()
        return jsonify(explanation)
    except Exception as exc:
        logger.exception("SHAP global explanation error")
        return jsonify({"error": str(exc)}), 400


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("ML_API_PORT", 5001))
    logger.info("Starting ML API server on port %s …", port)
    app.run(host="0.0.0.0", port=port, debug=False)
