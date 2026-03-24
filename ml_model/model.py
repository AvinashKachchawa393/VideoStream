"""
Hybrid Intrusion Detection Model
Architecture:
  1. CNN   – spatial feature extraction from traffic windows
  2. LSTM  – temporal pattern modelling
  3. Random Forest – final ensemble classification
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

NUM_CLASSES = 6  # BENIGN, DDoS, SQL_Injection, PortScan, BruteForce, Zero_Day


# ---------------------------------------------------------------------------
# CNN+LSTM deep feature extractor
# ---------------------------------------------------------------------------

def build_cnn_lstm_extractor(input_dim: int, num_classes: int = NUM_CLASSES) -> keras.Model:
    """
    Build a CNN–LSTM network that outputs:
      - deep_features : intermediate representation fed to Random Forest
      - predictions   : softmax probabilities (used for pre-training)
    """
    inputs = keras.Input(shape=(input_dim, 1), name="traffic_input")

    # --- CNN branch: spatial feature extraction ---
    x = layers.Conv1D(64, kernel_size=3, activation="relu", padding="same", name="conv1")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(128, kernel_size=3, activation="relu", padding="same", name="conv2")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)
    x = layers.Dropout(0.3)(x)

    # --- LSTM branch: temporal pattern analysis ---
    x = layers.LSTM(128, return_sequences=True, name="lstm1")(x)
    x = layers.LSTM(64, return_sequences=False, name="lstm2")(x)
    x = layers.Dropout(0.3)(x)

    # --- Dense head for deep features ---
    deep_features = layers.Dense(64, activation="relu", name="deep_features")(x)

    # --- Classification output (used during standalone training / evaluation) ---
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(deep_features)

    model = keras.Model(inputs=inputs, outputs=[deep_features, outputs], name="CNN_LSTM")
    return model


def build_rf_classifier() -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=42,
        class_weight="balanced",
    )


# ---------------------------------------------------------------------------
# Full Hybrid IDS Model
# ---------------------------------------------------------------------------

class HybridIDSModel:
    """
    Hybrid model pipeline:
      1. Reshape PCA-reduced features for CNN-LSTM
      2. Extract deep features with CNN-LSTM
      3. Classify with Random Forest on those features
    """

    def __init__(self, input_dim: int = 20, num_classes: int = NUM_CLASSES):
        self.input_dim = input_dim
        self.num_classes = num_classes
        self.cnn_lstm = build_cnn_lstm_extractor(input_dim, num_classes)
        self.rf = build_rf_classifier()
        self.is_trained = False
        self._compile_cnn_lstm()

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def _compile_cnn_lstm(self):
        self.cnn_lstm.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-3),
            loss={"predictions": "sparse_categorical_crossentropy"},
            metrics={"predictions": "accuracy"},
        )

    def _reshape_for_cnn(self, X: np.ndarray) -> np.ndarray:
        """Add channel dimension: (batch, features) → (batch, features, 1)."""
        return X.reshape(X.shape[0], X.shape[1], 1)

    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_val: np.ndarray = None, y_val: np.ndarray = None,
              epochs: int = 20, batch_size: int = 64):
        print("=== Training CNN-LSTM feature extractor ===")
        X_cnn = self._reshape_for_cnn(X_train)
        callbacks = [
            keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=3),
        ]
        validation_data = None
        if X_val is not None:
            validation_data = (
                self._reshape_for_cnn(X_val),
                {"predictions": y_val},
            )
        self.cnn_lstm.fit(
            X_cnn,
            {"predictions": y_train},
            epochs=epochs,
            batch_size=batch_size,
            validation_data=validation_data,
            callbacks=callbacks,
            verbose=1,
        )

        print("=== Extracting deep features for Random Forest ===")
        deep_features_train = self._extract_features(X_train)

        print("=== Training Random Forest classifier ===")
        self.rf.fit(deep_features_train, y_train)
        self.is_trained = True
        print("=== Hybrid model training complete ===")

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def _extract_features(self, X: np.ndarray) -> np.ndarray:
        X_cnn = self._reshape_for_cnn(X)
        # cnn_lstm returns [deep_features, predictions]; take deep_features
        deep_feats, _ = self.cnn_lstm.predict(X_cnn, verbose=0)
        return deep_feats

    def predict(self, X: np.ndarray) -> np.ndarray:
        feats = self._extract_features(X)
        return self.rf.predict(feats)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        feats = self._extract_features(X)
        return self.rf.predict_proba(feats)

    def predict_single(self, x: np.ndarray) -> tuple[int, np.ndarray]:
        """Predict a single sample. Returns (class_id, probabilities)."""
        X = x.reshape(1, -1)
        proba = self.predict_proba(X)[0]
        class_id = int(np.argmax(proba))
        return class_id, proba

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray,
                 class_names: list[str] = None) -> dict:
        y_pred = self.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        report = classification_report(
            y_test, y_pred, target_names=class_names, output_dict=True
        )
        cm = confusion_matrix(y_test, y_pred)
        print(f"\nAccuracy: {acc:.4f}")
        print(classification_report(y_test, y_pred, target_names=class_names))
        # FAR = FP / (FP + TN) — computed for binary (attack vs. benign)
        benign_class = 0
        y_bin_true = (y_test != benign_class).astype(int)
        y_bin_pred = (y_pred != benign_class).astype(int)
        fp = ((y_bin_pred == 1) & (y_bin_true == 0)).sum()
        tn = ((y_bin_pred == 0) & (y_bin_true == 0)).sum()
        far = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        return {
            "accuracy": acc,
            "false_alarm_rate": far,
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str = MODELS_DIR):
        self.cnn_lstm.save(os.path.join(path, "cnn_lstm.keras"))
        joblib.dump(self.rf, os.path.join(path, "random_forest.pkl"))
        print(f"Hybrid model saved to {path}")

    @classmethod
    def load(cls, path: str = MODELS_DIR) -> "HybridIDSModel":
        obj = cls.__new__(cls)
        obj.cnn_lstm = keras.models.load_model(os.path.join(path, "cnn_lstm.keras"))
        obj.rf = joblib.load(os.path.join(path, "random_forest.pkl"))
        obj.input_dim = obj.cnn_lstm.input_shape[1]
        obj.num_classes = NUM_CLASSES
        obj.is_trained = True
        return obj
