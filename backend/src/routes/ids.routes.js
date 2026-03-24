import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    ingestTraffic,
    predict,
    getAlerts,
    getAlertById,
    updateAlert,
    getStats,
    explainLime,
    explainShap,
    explainShapGlobal,
} from "../controllers/ids.controller.js";

const router = Router();

// Rate limiter for write / ML-inference endpoints (100 req / 15 min per IP)
const ingestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
});

// Rate limiter for read endpoints (300 req / 15 min per IP)
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
});

// Data ingestion & prediction
router.post("/ingest", ingestLimiter, ingestTraffic);
router.post("/predict", ingestLimiter, predict);

// Alert management
router.get("/alerts", readLimiter, getAlerts);
router.get("/alerts/:alertId", readLimiter, getAlertById);
router.patch("/alerts/:alertId", ingestLimiter, updateAlert);

// Statistics
router.get("/stats", readLimiter, getStats);

// Explainable AI
router.post("/explain/lime", ingestLimiter, explainLime);
router.post("/explain/shap", ingestLimiter, explainShap);
router.get("/explain/shap/global", readLimiter, explainShapGlobal);

export default router;
