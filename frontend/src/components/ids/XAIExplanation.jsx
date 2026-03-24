/**
 * XAI Explanation panel – renders LIME and SHAP outputs in a human-readable form.
 */
import React from "react";
import { Box, Typography, Paper, Chip, Divider, LinearProgress } from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";

const ATTACK_COLORS = {
    BENIGN: "#4caf50",
    DDoS: "#f44336",
    SQL_Injection: "#ff9800",
    PortScan: "#03a9f4",
    BruteForce: "#9c27b0",
    Zero_Day: "#e91e63",
};

function ProbabilityBar({ label, value }) {
    const color = ATTACK_COLORS[label] || "#58a6ff";
    const pct = (value * 100).toFixed(1);
    return (
        <Box sx={{ mb: 0.8 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: "#e6edf3" }}>
                    {label}
                </Typography>
                <Typography variant="caption" sx={{ color }}>
                    {pct}%
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={parseFloat(pct)}
                sx={{
                    height: 5,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.05)",
                    "& .MuiLinearProgress-bar": { background: color, borderRadius: 2 },
                }}
            />
        </Box>
    );
}

function FeatureBar({ feature, weight, maxAbs }) {
    const isPositive = weight >= 0;
    const color = isPositive ? "#f44336" : "#4caf50";
    const pct = Math.abs((weight / maxAbs) * 100);
    return (
        <Box sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.2 }}>
                <Typography variant="caption" sx={{ color: "#e6edf3", fontFamily: "monospace" }}>
                    {feature}
                </Typography>
                <Typography variant="caption" sx={{ color }}>
                    {isPositive ? "+" : ""}{weight.toFixed(4)}
                </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                    {!isPositive && (
                        <Box
                            sx={{
                                width: `${pct}%`,
                                height: 6,
                                background: color,
                                borderRadius: "2px 0 0 2px",
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ width: 1, height: 12, background: "rgba(255,255,255,0.2)" }} />
                <Box sx={{ flex: 1 }}>
                    {isPositive && (
                        <Box
                            sx={{
                                width: `${pct}%`,
                                height: 6,
                                background: color,
                                borderRadius: "0 2px 2px 0",
                            }}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export default function XAIExplanation({ limeData, shapData }) {
    if (!limeData && !shapData) {
        return (
            <Paper
                sx={{
                    p: 3,
                    background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    textAlign: "center",
                }}
            >
                <PsychologyIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.2)", mb: 1 }} />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>
                    Select an alert to see the XAI explanation.
                </Typography>
            </Paper>
        );
    }

    const activeData = limeData || shapData;
    const probabilities = activeData?.probabilities || {};
    const topFeatures = limeData?.top_features || shapData?.local_shap_values || [];
    const predictedClass = activeData?.predicted_class || "—";
    const color = ATTACK_COLORS[predictedClass] || "#58a6ff";
    const maxAbs = topFeatures.length
        ? Math.max(...topFeatures.map((f) => Math.abs(f.weight ?? f.shap_value ?? 0)))
        : 1;

    return (
        <Paper
            sx={{
                p: 2,
                background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 2,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <PsychologyIcon sx={{ color: "#58a6ff" }} />
                <Typography variant="subtitle1" sx={{ color: "#e6edf3", fontWeight: 600 }}>
                    🔍 Explainable AI — {limeData ? "LIME" : "SHAP"}
                </Typography>
            </Box>

            {/* Predicted class */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mb: 0.5 }}>
                    Prediction
                </Typography>
                <Chip
                    label={predictedClass}
                    sx={{
                        background: `${color}22`,
                        color,
                        border: `1px solid ${color}55`,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                    }}
                />
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

            {/* Probability distribution */}
            {Object.keys(probabilities).length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mb: 1 }}>
                        Class Probabilities
                    </Typography>
                    {Object.entries(probabilities).map(([cls, val]) => (
                        <ProbabilityBar key={cls} label={cls} value={val} />
                    ))}
                </Box>
            )}

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

            {/* Feature contributions */}
            {topFeatures.length > 0 && (
                <Box>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mb: 1 }}>
                        Top Contributing Features
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: "rgba(255,255,255,0.3)" }}>
                            (red = increases risk, green = reduces risk)
                        </Typography>
                    </Typography>
                    {topFeatures.slice(0, 10).map((f, i) => (
                        <FeatureBar
                            key={i}
                            feature={f.feature}
                            weight={f.weight ?? f.shap_value ?? 0}
                            maxAbs={maxAbs}
                        />
                    ))}
                </Box>
            )}
        </Paper>
    );
}
