"""
Data Preprocessing Module
- PCA for dimensionality reduction
- SMOTE / KMeans-SMOTE for class imbalance handling
- Feature scaling and encoding
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from imblearn.over_sampling import SMOTE, KMeansSMOTE
from sklearn.model_selection import train_test_split
import joblib
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Feature columns representative of CICIDS2017 / UNSW-NB15 / TON-IoT datasets
FEATURE_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
    "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted", "num_root", "num_file_creations",
    "num_shells", "num_access_files", "num_outbound_cmds", "is_host_login",
    "is_guest_login", "count", "srv_count", "serror_rate", "srv_serror_rate",
    "rerror_rate", "srv_rerror_rate", "same_srv_rate", "diff_srv_rate",
    "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate", "dst_host_serror_rate", "dst_host_srv_serror_rate",
    "dst_host_rerror_rate", "dst_host_srv_rerror_rate",
]

LABEL_COLUMN = "label"

ATTACK_CLASSES = {
    0: "BENIGN",
    1: "DDoS",
    2: "SQL_Injection",
    3: "PortScan",
    4: "BruteForce",
    5: "Zero_Day",
}


class DataPreprocessor:
    """Handles all preprocessing steps for network traffic data."""

    def __init__(self, n_components: int = 20, use_kmeans_smote: bool = False):
        self.n_components = n_components
        self.use_kmeans_smote = use_kmeans_smote
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=n_components, random_state=42)
        self.label_encoder = LabelEncoder()
        self.feature_columns: list[str] = []
        self.is_fitted = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit_transform(self, df: pd.DataFrame):
        """Full preprocessing pipeline: scale → PCA → SMOTE."""
        X, y = self._extract_features_labels(df)
        X_scaled = self.scaler.fit_transform(X)
        X_pca = self.pca.fit_transform(X_scaled)
        X_resampled, y_resampled = self._apply_smote(X_pca, y)
        self.is_fitted = True
        return X_resampled, y_resampled

    def transform(self, df: pd.DataFrame):
        """Transform new data using fitted preprocessing pipeline."""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted before transforming.")
        X, _ = self._extract_features_labels(df, training=False)
        X_scaled = self.scaler.transform(X)
        return self.pca.transform(X_scaled)

    def transform_single(self, features: dict) -> np.ndarray:
        """Transform a single feature dict into a PCA-reduced array."""
        df = pd.DataFrame([features])
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
        df = df[self.feature_columns]
        X_scaled = self.scaler.transform(df.values)
        return self.pca.transform(X_scaled)

    def save(self, path: str = MODELS_DIR):
        joblib.dump(self.scaler, os.path.join(path, "scaler.pkl"))
        joblib.dump(self.pca, os.path.join(path, "pca.pkl"))
        joblib.dump(self.label_encoder, os.path.join(path, "label_encoder.pkl"))
        joblib.dump(self.feature_columns, os.path.join(path, "feature_columns.pkl"))
        print(f"Preprocessor saved to {path}")

    @classmethod
    def load(cls, path: str = MODELS_DIR) -> "DataPreprocessor":
        obj = cls.__new__(cls)
        obj.scaler = joblib.load(os.path.join(path, "scaler.pkl"))
        obj.pca = joblib.load(os.path.join(path, "pca.pkl"))
        obj.label_encoder = joblib.load(os.path.join(path, "label_encoder.pkl"))
        obj.feature_columns = joblib.load(os.path.join(path, "feature_columns.pkl"))
        obj.n_components = obj.pca.n_components_
        obj.is_fitted = True
        return obj

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _extract_features_labels(self, df: pd.DataFrame, training: bool = True):
        available_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
        # Keep only numeric-compatible columns
        numeric_df = df[available_cols].apply(pd.to_numeric, errors="coerce").fillna(0)

        if training:
            self.feature_columns = list(numeric_df.columns)

        X = numeric_df[self.feature_columns if self.feature_columns else available_cols].values

        if LABEL_COLUMN in df.columns and training:
            y = self.label_encoder.fit_transform(df[LABEL_COLUMN].astype(str))
        elif LABEL_COLUMN in df.columns:
            y = self.label_encoder.transform(df[LABEL_COLUMN].astype(str))
        else:
            y = np.zeros(len(X), dtype=int)

        return X, y

    def _apply_smote(self, X: np.ndarray, y: np.ndarray):
        """Apply SMOTE or KMeans-SMOTE to balance classes."""
        try:
            if self.use_kmeans_smote:
                sampler = KMeansSMOTE(random_state=42)
            else:
                sampler = SMOTE(random_state=42)
            X_res, y_res = sampler.fit_resample(X, y)
            print(f"SMOTE applied. Before: {len(y)} → After: {len(y_res)} samples.")
            return X_res, y_res
        except Exception as exc:
            print(f"SMOTE skipped ({exc}). Using original data.")
            return X, y


def generate_synthetic_dataset(n_samples: int = 5000) -> pd.DataFrame:
    """Generate a synthetic dataset mimicking CICIDS2017 structure for testing."""
    np.random.seed(42)
    n_features = len(FEATURE_COLUMNS)
    X = np.random.randn(n_samples, n_features) * 10 + 50

    labels = np.random.choice(
        list(ATTACK_CLASSES.values()),
        size=n_samples,
        p=[0.60, 0.15, 0.10, 0.07, 0.05, 0.03],
    )

    df = pd.DataFrame(X, columns=FEATURE_COLUMNS)
    df[LABEL_COLUMN] = labels

    # Simulate realistic feature values
    df["src_bytes"] = np.abs(df["src_bytes"]) * 1000
    df["dst_bytes"] = np.abs(df["dst_bytes"]) * 500
    df["duration"] = np.abs(df["duration"])
    df["count"] = np.abs(df["count"]).astype(int).clip(1, 512)
    df["protocol_type"] = np.random.choice([6, 17, 1], size=n_samples)  # TCP/UDP/ICMP

    return df


if __name__ == "__main__":
    print("Generating synthetic dataset …")
    df = generate_synthetic_dataset(2000)
    preprocessor = DataPreprocessor(n_components=20)
    X, y = preprocessor.fit_transform(df)
    print(f"Preprocessed shape: X={X.shape}, y={y.shape}")
    preprocessor.save()
