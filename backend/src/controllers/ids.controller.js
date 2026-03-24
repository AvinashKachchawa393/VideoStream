import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { Alert } from "../models/alert.model.js";
import { BlockchainRecord } from "../models/blockchain.model.js";

const ML_API_BASE = process.env.ML_API_URL || "http://localhost:5001";

// -------------------------------------------------------------------------
// Helper utilities
// -------------------------------------------------------------------------

/**
 * Derive a severity level from the predicted attack type and confidence.
 */
function deriveSeverity(attackType, confidence) {
    if (attackType === "BENIGN") return "low";
    if (attackType === "Zero_Day") return "critical";
    if (attackType === "DDoS" && confidence > 0.8) return "critical";
    if (attackType === "SQL_Injection") return confidence > 0.7 ? "high" : "medium";
    if (confidence > 0.85) return "high";
    if (confidence > 0.6) return "medium";
    return "low";
}

/**
 * Compute a SHA-256 hash of the alert payload (for blockchain anchoring).
 */
function hashPayload(payload) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
}

/**
 * Simulate a blockchain transaction for alert immutability.
 * In production, replace with an actual Web3 / Hyperledger SDK call.
 */
async function recordOnBlockchain(alert) {
    const dataHash = hashPayload({
        alertId: alert.alertId,
        attackType: alert.attackType,
        sourceIp: alert.sourceIp,
        timestamp: alert.timestamp,
        confidence: alert.confidence,
    });

    // Simulate a transaction hash and block number
    const txHash = "0x" + crypto.randomBytes(32).toString("hex");
    const blockNumber = Math.floor(Math.random() * 1_000_000) + 18_000_000;

    const record = new BlockchainRecord({
        alertId: alert.alertId,
        txHash,
        blockNumber,
        dataHash,
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        status: "confirmed",
        confirmations: Math.floor(Math.random() * 12) + 1,
    });

    await record.save();

    // Update the alert with the tx hash
    alert.blockchainTxHash = txHash;
    alert.blockchainRecorded = true;
    await alert.save();

    return { txHash, blockNumber, dataHash };
}

// -------------------------------------------------------------------------
// POST /api/v1/ids/ingest
// -------------------------------------------------------------------------
export async function ingestTraffic(req, res) {
    try {
        const { features, metadata = {} } = req.body;
        if (!features || typeof features !== "object") {
            return res.status(400).json({ error: "'features' object is required" });
        }

        // Forward to Python ML API
        const mlResponse = await axios.post(`${ML_API_BASE}/predict`, { features });
        const prediction = mlResponse.data;

        const severity = deriveSeverity(prediction.predicted_class, prediction.confidence);
        const alertId = uuidv4();

        const alertData = {
            alertId,
            sourceIp: metadata.src_ip || features.src_ip || "unknown",
            destinationIp: metadata.dst_ip || features.dst_ip || "unknown",
            sourcePort: metadata.src_port || features.src_port,
            destinationPort: metadata.dst_port || features.dst_port,
            protocol: metadata.protocol || features.protocol,
            attackType: prediction.predicted_class,
            confidence: prediction.confidence,
            isAnomaly: prediction.is_anomaly,
            reconstructionError: prediction.reconstruction_error,
            severity,
            probabilities: prediction.probabilities,
            rawFeatures: features,
        };

        const alert = new Alert(alertData);
        await alert.save();

        // Record on blockchain asynchronously (don't block response)
        if (prediction.predicted_class !== "BENIGN" || prediction.is_anomaly) {
            recordOnBlockchain(alert).catch((err) =>
                console.error("Blockchain recording error:", err)
            );

            // Emit real-time event via Socket.IO (attached to req.app)
            const io = req.app.get("io");
            if (io) {
                io.emit("new_alert", {
                    alertId,
                    attackType: prediction.predicted_class,
                    severity,
                    sourceIp: alertData.sourceIp,
                    confidence: prediction.confidence,
                    timestamp: new Date(),
                });
            }
        }

        return res.status(200).json({
            alertId,
            prediction,
            severity,
            message: "Traffic ingested and analysed successfully",
        });
    } catch (error) {
        console.error("ingestTraffic error:", error.message);
        return res.status(500).json({ error: "Internal server error", detail: error.message });
    }
}

// -------------------------------------------------------------------------
// POST /api/v1/ids/predict
// -------------------------------------------------------------------------
export async function predict(req, res) {
    try {
        const { features } = req.body;
        if (!features) {
            return res.status(400).json({ error: "'features' object is required" });
        }
        const mlResponse = await axios.post(`${ML_API_BASE}/predict`, { features });
        return res.status(200).json(mlResponse.data);
    } catch (error) {
        console.error("predict error:", error.message);
        return res.status(500).json({ error: "Prediction service unavailable", detail: error.message });
    }
}

// -------------------------------------------------------------------------
// GET /api/v1/ids/alerts
// -------------------------------------------------------------------------
export async function getAlerts(req, res) {
    try {
        const {
            page = 1,
            limit = 20,
            attackType,
            severity,
            status,
            startDate,
            endDate,
        } = req.query;

        const filter = {};
        if (attackType) filter.attackType = attackType;
        if (severity) filter.severity = severity;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [alerts, total] = await Promise.all([
            Alert.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Alert.countDocuments(filter),
        ]);

        return res.status(200).json({
            alerts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("getAlerts error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// -------------------------------------------------------------------------
// GET /api/v1/ids/alerts/:alertId
// -------------------------------------------------------------------------
export async function getAlertById(req, res) {
    try {
        const alert = await Alert.findOne({ alertId: req.params.alertId }).lean();
        if (!alert) return res.status(404).json({ error: "Alert not found" });

        // Fetch blockchain record if available
        const blockchainRecord = alert.blockchainRecorded
            ? await BlockchainRecord.findOne({ alertId: alert.alertId }).lean()
            : null;

        return res.status(200).json({ alert, blockchainRecord });
    } catch (error) {
        console.error("getAlertById error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// -------------------------------------------------------------------------
// PATCH /api/v1/ids/alerts/:alertId
// -------------------------------------------------------------------------
export async function updateAlert(req, res) {
    try {
        const { status, notes, resolvedBy } = req.body;
        const update = { status, notes };
        if (status === "resolved") {
            update.resolvedAt = new Date();
            update.resolvedBy = resolvedBy || "system";
        }

        const alert = await Alert.findOneAndUpdate(
            { alertId: req.params.alertId },
            { $set: update },
            { new: true }
        );

        if (!alert) return res.status(404).json({ error: "Alert not found" });
        return res.status(200).json({ alert });
    } catch (error) {
        console.error("updateAlert error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// -------------------------------------------------------------------------
// GET /api/v1/ids/stats
// -------------------------------------------------------------------------
export async function getStats(req, res) {
    try {
        const [
            totalAlerts,
            attackDistribution,
            severityDistribution,
            recentAlerts,
        ] = await Promise.all([
            Alert.countDocuments(),
            Alert.aggregate([
                { $group: { _id: "$attackType", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            Alert.aggregate([
                { $group: { _id: "$severity", count: { $sum: 1 } } },
            ]),
            Alert.find()
                .sort({ timestamp: -1 })
                .limit(5)
                .select("alertId attackType severity sourceIp timestamp confidence")
                .lean(),
        ]);

        // Alerts per hour (last 24 h)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const hourlyAlerts = await Alert.aggregate([
            { $match: { timestamp: { $gte: since } } },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        return res.status(200).json({
            totalAlerts,
            attackDistribution,
            severityDistribution,
            recentAlerts,
            hourlyAlerts,
        });
    } catch (error) {
        console.error("getStats error:", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// -------------------------------------------------------------------------
// POST /api/v1/ids/explain/lime
// -------------------------------------------------------------------------
export async function explainLime(req, res) {
    try {
        const { features } = req.body;
        if (!features) return res.status(400).json({ error: "'features' required" });
        const mlResponse = await axios.post(`${ML_API_BASE}/explain/lime`, { features });
        return res.status(200).json(mlResponse.data);
    } catch (error) {
        console.error("explainLime error:", error.message);
        return res.status(500).json({ error: "XAI service unavailable" });
    }
}

// -------------------------------------------------------------------------
// POST /api/v1/ids/explain/shap
// -------------------------------------------------------------------------
export async function explainShap(req, res) {
    try {
        const { features } = req.body;
        if (!features) return res.status(400).json({ error: "'features' required" });
        const mlResponse = await axios.post(`${ML_API_BASE}/explain/shap`, { features });
        return res.status(200).json(mlResponse.data);
    } catch (error) {
        console.error("explainShap error:", error.message);
        return res.status(500).json({ error: "XAI service unavailable" });
    }
}

// -------------------------------------------------------------------------
// GET /api/v1/ids/explain/shap/global
// -------------------------------------------------------------------------
export async function explainShapGlobal(req, res) {
    try {
        const mlResponse = await axios.get(`${ML_API_BASE}/explain/shap/global`);
        return res.status(200).json(mlResponse.data);
    } catch (error) {
        console.error("explainShapGlobal error:", error.message);
        return res.status(500).json({ error: "XAI service unavailable" });
    }
}
