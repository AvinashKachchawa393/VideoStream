"""
Explainable AI (XAI) Module
- LIME  : local per-prediction explanation
- SHAP  : global feature importance (TreeExplainer for Random Forest)
"""

import numpy as np
import shap
import lime
import lime.lime_tabular
from typing import Any
import warnings

warnings.filterwarnings("ignore")


class XAIExplainer:
    """
    Wraps both LIME and SHAP explainers around the hybrid IDS model.
    Designed to be instantiated once after model training and reused.
    """

    def __init__(self, hybrid_model, X_train: np.ndarray, feature_names: list[str],
                 class_names: list[str]):
        """
        Parameters
        ----------
        hybrid_model : HybridIDSModel  (from model.py)
        X_train      : training data (post-PCA) used to build LIME background
        feature_names: names for each PCA component (e.g. ['PC1', 'PC2', …])
        class_names  : human-readable class labels
        """
        self.hybrid_model = hybrid_model
        self.feature_names = feature_names
        self.class_names = class_names
        self.X_train = X_train

        # LIME explainer (tabular)
        self.lime_explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data=X_train,
            feature_names=feature_names,
            class_names=class_names,
            mode="classification",
            discretize_continuous=True,
            random_state=42,
        )

        # SHAP TreeExplainer on the underlying Random Forest
        self.shap_explainer = shap.TreeExplainer(hybrid_model.rf)

    # ------------------------------------------------------------------
    # LIME
    # ------------------------------------------------------------------

    def explain_lime(self, x: np.ndarray, num_features: int = 10) -> dict:
        """
        Generate a LIME explanation for a single sample.

        Returns a dict:
        {
          "predicted_class": str,
          "predicted_class_id": int,
          "probabilities": {class_name: prob, …},
          "top_features": [(feature, weight), …],
        }
        """
        def predict_fn(X_arr):
            return self.hybrid_model.predict_proba(X_arr)

        exp = self.lime_explainer.explain_instance(
            data_row=x,
            predict_fn=predict_fn,
            num_features=num_features,
            top_labels=1,
        )
        predicted_label = exp.available_labels()[0]
        feature_weights = exp.as_list(label=predicted_label)

        probas = predict_fn(x.reshape(1, -1))[0]
        prob_dict = {self.class_names[i]: float(p) for i, p in enumerate(probas)}

        return {
            "predicted_class": self.class_names[predicted_label],
            "predicted_class_id": int(predicted_label),
            "probabilities": prob_dict,
            "top_features": [
                {"feature": feat, "weight": float(weight)}
                for feat, weight in feature_weights
            ],
        }

    # ------------------------------------------------------------------
    # SHAP
    # ------------------------------------------------------------------

    def explain_shap_global(self, X_sample: np.ndarray = None,
                             max_samples: int = 200) -> dict:
        """
        Compute global SHAP feature importances.
        Returns mean absolute SHAP value per feature.
        """
        if X_sample is None:
            idx = np.random.choice(len(self.X_train), min(max_samples, len(self.X_train)),
                                   replace=False)
            X_sample = self.X_train[idx]

        # Extract deep features first (RF operates on deep_features)
        deep_feats = self.hybrid_model._extract_features(X_sample)
        shap_values = self.shap_explainer.shap_values(deep_feats)

        # shap_values shape: (n_classes, n_samples, n_features) for multi-class RF
        if isinstance(shap_values, list):
            mean_abs = np.mean(np.abs(np.array(shap_values)), axis=(0, 1))
        else:
            mean_abs = np.mean(np.abs(shap_values), axis=0)

        deep_feature_names = [f"DeepFeat_{i}" for i in range(deep_feats.shape[1])]
        importance_dict = {
            name: float(val) for name, val in zip(deep_feature_names, mean_abs)
        }
        sorted_importance = sorted(importance_dict.items(), key=lambda kv: kv[1], reverse=True)

        return {
            "method": "SHAP_TreeExplainer",
            "global_feature_importance": [
                {"feature": k, "importance": v} for k, v in sorted_importance
            ],
        }

    def explain_shap_local(self, x: np.ndarray) -> dict:
        """
        Compute SHAP values for a single sample.
        Returns the top contributing deep features.
        """
        deep_feat = self.hybrid_model._extract_features(x.reshape(1, -1))
        shap_values = self.shap_explainer.shap_values(deep_feat)

        predicted_class_id, probas = self.hybrid_model.predict_single(x)

        if isinstance(shap_values, list):
            class_shap = shap_values[predicted_class_id][0]
        else:
            class_shap = shap_values[0]

        deep_feature_names = [f"DeepFeat_{i}" for i in range(len(class_shap))]
        local_explanation = sorted(
            [{"feature": n, "shap_value": float(v)}
             for n, v in zip(deep_feature_names, class_shap)],
            key=lambda d: abs(d["shap_value"]),
            reverse=True,
        )

        return {
            "method": "SHAP_local",
            "predicted_class": self.class_names[predicted_class_id],
            "predicted_class_id": predicted_class_id,
            "probabilities": {
                self.class_names[i]: float(p) for i, p in enumerate(probas)
            },
            "local_shap_values": local_explanation[:10],
        }
