"""
LSTM Autoencoder for Anomaly Detection (zero-day / unknown attack detection)
Trains on benign traffic only; high reconstruction error → anomaly.
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import joblib
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

DEFAULT_THRESHOLD_PERCENTILE = 95  # flag top-5 % reconstruction errors as anomalies


class LSTMAutoencoder:
    """
    Sequence-to-sequence LSTM Autoencoder.
    Input shape: (batch, timesteps, features)
    The model is trained exclusively on normal (benign) traffic.
    At inference, samples with reconstruction error above a learned
    threshold are flagged as anomalies.
    """

    def __init__(self, input_dim: int, timesteps: int = 1,
                 latent_dim: int = 32, threshold_percentile: int = DEFAULT_THRESHOLD_PERCENTILE):
        self.input_dim = input_dim
        self.timesteps = timesteps
        self.latent_dim = latent_dim
        self.threshold_percentile = threshold_percentile
        self.threshold: float = 0.0
        self.model = self._build_model()
        self._compile()

    # ------------------------------------------------------------------
    # Architecture
    # ------------------------------------------------------------------

    def _build_model(self) -> keras.Model:
        inputs = keras.Input(shape=(self.timesteps, self.input_dim), name="ae_input")

        # Encoder
        encoded = layers.LSTM(64, return_sequences=True, name="enc_lstm1")(inputs)
        encoded = layers.LSTM(self.latent_dim, return_sequences=False, name="enc_lstm2")(encoded)

        # Bottleneck → repeat for decoder
        repeated = layers.RepeatVector(self.timesteps, name="bottleneck")(encoded)

        # Decoder
        decoded = layers.LSTM(self.latent_dim, return_sequences=True, name="dec_lstm1")(repeated)
        decoded = layers.LSTM(64, return_sequences=True, name="dec_lstm2")(decoded)
        outputs = layers.TimeDistributed(
            layers.Dense(self.input_dim), name="reconstruction"
        )(decoded)

        return keras.Model(inputs, outputs, name="LSTM_Autoencoder")

    def _compile(self):
        self.model.compile(
            optimizer=keras.optimizers.Adam(1e-3),
            loss="mse",
        )

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def _reshape(self, X: np.ndarray) -> np.ndarray:
        """Reshape (batch, features) → (batch, timesteps=1, features)."""
        if X.ndim == 2:
            return X.reshape(X.shape[0], self.timesteps, self.input_dim)
        return X

    def train(self, X_benign: np.ndarray, epochs: int = 30, batch_size: int = 64):
        """Train autoencoder on benign traffic only."""
        print("=== Training LSTM Autoencoder on benign traffic ===")
        X_seq = self._reshape(X_benign)
        callbacks = [
            keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        ]
        self.model.fit(
            X_seq, X_seq,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.1,
            callbacks=callbacks,
            verbose=1,
        )
        # Calibrate threshold on training data
        reconstruction_errors = self._compute_errors(X_benign)
        self.threshold = float(np.percentile(reconstruction_errors, self.threshold_percentile))
        print(f"Anomaly threshold set to {self.threshold:.6f} "
              f"(p{self.threshold_percentile} of benign reconstruction error)")

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def _compute_errors(self, X: np.ndarray) -> np.ndarray:
        X_seq = self._reshape(X)
        X_reconstructed = self.model.predict(X_seq, verbose=0)
        # MSE per sample
        errors = np.mean(np.power(X_seq - X_reconstructed, 2), axis=(1, 2))
        return errors

    def detect(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """
        Returns:
            anomaly_flags : bool array, True = anomaly
            errors        : reconstruction MSE per sample
        """
        errors = self._compute_errors(X)
        anomaly_flags = errors > self.threshold
        return anomaly_flags, errors

    def detect_single(self, x: np.ndarray) -> tuple[bool, float]:
        """Detect anomaly in a single feature vector."""
        flags, errors = self.detect(x.reshape(1, -1))
        return bool(flags[0]), float(errors[0])

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str = MODELS_DIR):
        self.model.save(os.path.join(path, "lstm_autoencoder.keras"))
        joblib.dump(
            {
                "threshold": self.threshold,
                "input_dim": self.input_dim,
                "timesteps": self.timesteps,
                "latent_dim": self.latent_dim,
                "threshold_percentile": self.threshold_percentile,
            },
            os.path.join(path, "autoencoder_meta.pkl"),
        )
        print(f"LSTM Autoencoder saved to {path}")

    @classmethod
    def load(cls, path: str = MODELS_DIR) -> "LSTMAutoencoder":
        meta = joblib.load(os.path.join(path, "autoencoder_meta.pkl"))
        obj = cls.__new__(cls)
        obj.input_dim = meta["input_dim"]
        obj.timesteps = meta["timesteps"]
        obj.latent_dim = meta["latent_dim"]
        obj.threshold_percentile = meta["threshold_percentile"]
        obj.threshold = meta["threshold"]
        obj.model = keras.models.load_model(
            os.path.join(path, "lstm_autoencoder.keras")
        )
        return obj
