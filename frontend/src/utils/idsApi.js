/**
 * IDS API client – wraps all REST calls to the Node.js backend IDS routes.
 */
import axios from "axios";
import server from "../environment";

const idsClient = axios.create({
    baseURL: `${server}/api/v1/ids`,
    timeout: 30000,
});

export const idsApi = {
    // ── Stats ──────────────────────────────────────────────────────────────
    getStats: () => idsClient.get("/stats"),

    // ── Alerts ─────────────────────────────────────────────────────────────
    getAlerts: (params = {}) => idsClient.get("/alerts", { params }),
    getAlertById: (alertId) => idsClient.get(`/alerts/${alertId}`),
    updateAlert: (alertId, data) => idsClient.patch(`/alerts/${alertId}`, data),

    // ── Traffic ingestion / prediction ─────────────────────────────────────
    ingestTraffic: (features, metadata = {}) =>
        idsClient.post("/ingest", { features, metadata }),
    predict: (features) => idsClient.post("/predict", { features }),

    // ── XAI ────────────────────────────────────────────────────────────────
    explainLime: (features) => idsClient.post("/explain/lime", { features }),
    explainShap: (features) => idsClient.post("/explain/shap", { features }),
    getShapGlobal: () => idsClient.get("/explain/shap/global"),
};

export default idsApi;
