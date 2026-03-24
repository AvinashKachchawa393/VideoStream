"""
Training Script for the Hybrid IDS Model + LSTM Autoencoder
Usage:
    python train.py [--samples N] [--epochs E] [--pca-components C]
"""

import argparse
import os
import numpy as np
from sklearn.model_selection import train_test_split

from preprocessing import DataPreprocessor, generate_synthetic_dataset, ATTACK_CLASSES
from model import HybridIDSModel
from autoencoder import LSTMAutoencoder

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")


def train(n_samples: int = 5000, epochs: int = 20, pca_components: int = 20):
    print("=" * 60)
    print("AI-Powered IDS — Training Pipeline")
    print("=" * 60)

    # --- 1. Generate / load dataset ---
    print(f"\n[1/5] Generating synthetic dataset ({n_samples} samples) …")
    df = generate_synthetic_dataset(n_samples)
    print(f"      Label distribution:\n{df['label'].value_counts()}\n")

    # --- 2. Preprocess ---
    print(f"[2/5] Preprocessing (PCA={pca_components} components, SMOTE) …")
    preprocessor = DataPreprocessor(n_components=pca_components, use_kmeans_smote=False)
    X, y = preprocessor.fit_transform(df)
    class_names = list(preprocessor.label_encoder.classes_)
    print(f"      Final dataset: X={X.shape}, classes={class_names}")
    preprocessor.save(MODELS_DIR)

    # --- 3. Train/val/test split ---
    print("[3/5] Splitting dataset …")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.1, random_state=42, stratify=y_train
    )
    print(f"      Train={len(y_train)}, Val={len(y_val)}, Test={len(y_test)}")

    # --- 4. Train Hybrid IDS (CNN-LSTM + RF) ---
    print("\n[4/5] Training Hybrid IDS Model (CNN-LSTM + Random Forest) …")
    hybrid_model = HybridIDSModel(input_dim=pca_components)
    hybrid_model.train(X_train, y_train, X_val, y_val, epochs=epochs, batch_size=64)
    metrics = hybrid_model.evaluate(X_test, y_test, class_names=class_names)
    print(f"\nTest Accuracy : {metrics['accuracy']:.4f}")
    print(f"False Alarm Rate: {metrics['false_alarm_rate']:.4f}")
    hybrid_model.save(MODELS_DIR)

    # --- 5. Train LSTM Autoencoder on benign traffic ---
    print("\n[5/5] Training LSTM Autoencoder (anomaly detection) …")
    benign_mask = y_train == list(preprocessor.label_encoder.classes_).index("BENIGN")
    X_benign = X_train[benign_mask]
    autoencoder = LSTMAutoencoder(input_dim=pca_components, timesteps=1)
    autoencoder.train(X_benign, epochs=epochs, batch_size=64)
    autoencoder.save(MODELS_DIR)

    print("\n" + "=" * 60)
    print("Training complete. All models saved to:", MODELS_DIR)
    print("=" * 60)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the Hybrid IDS Model")
    parser.add_argument("--samples", type=int, default=5000,
                        help="Number of synthetic training samples")
    parser.add_argument("--epochs", type=int, default=20,
                        help="Number of training epochs")
    parser.add_argument("--pca-components", type=int, default=20,
                        help="Number of PCA components")
    args = parser.parse_args()

    train(n_samples=args.samples, epochs=args.epochs, pca_components=args.pca_components)
