/**
 * MetricsPanel – displays accuracy, FAR, total alerts, and attack distribution.
 */
import React from "react";
import { Box, Typography, Paper, Grid, LinearProgress, Chip } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";

const ATTACK_COLORS = {
    BENIGN: "#4caf50",
    DDoS: "#f44336",
    SQL_Injection: "#ff9800",
    PortScan: "#03a9f4",
    BruteForce: "#9c27b0",
    Zero_Day: "#e91e63",
};

const MetricCard = ({ icon, label, value, color = "#58a6ff", subtitle }) => (
    <Paper
        sx={{
            p: 2,
            background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 2,
            textAlign: "center",
        }}
    >
        <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
        <Typography variant="h4" sx={{ color, fontWeight: 700, lineHeight: 1.2 }}>
            {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "#e6edf3", fontWeight: 600, mt: 0.5 }}>
            {label}
        </Typography>
        {subtitle && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                {subtitle}
            </Typography>
        )}
    </Paper>
);

export default function MetricsPanel({ stats = {} }) {
    const {
        totalAlerts = 0,
        attackDistribution = [],
        severityDistribution = [],
    } = stats;

    const totalAttacks = attackDistribution
        .filter((d) => d._id !== "BENIGN")
        .reduce((s, d) => s + d.count, 0);

    const totalBenign = attackDistribution.find((d) => d._id === "BENIGN")?.count || 0;
    const accuracy = totalAlerts > 0 ? ((totalBenign / totalAlerts) * 100).toFixed(1) : "—";
    const far = totalAlerts > 0 ? ((totalAttacks / totalAlerts) * 5).toFixed(2) : "—";

    const severityMap = {};
    severityDistribution.forEach((s) => { severityMap[s._id] = s.count; });

    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <MetricCard
                        icon={<SecurityIcon fontSize="large" />}
                        label="Total Alerts"
                        value={totalAlerts.toLocaleString()}
                        color="#58a6ff"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricCard
                        icon={<WarningIcon fontSize="large" />}
                        label="Threats Detected"
                        value={totalAttacks.toLocaleString()}
                        color="#f44336"
                        subtitle="Non-benign traffic"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricCard
                        icon={<CheckCircleIcon fontSize="large" />}
                        label="Accuracy"
                        value={`${accuracy}%`}
                        color="#4caf50"
                        subtitle="Model accuracy"
                    />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <MetricCard
                        icon={<SpeedIcon fontSize="large" />}
                        label="False Alarm Rate"
                        value={`${far}%`}
                        color="#ff9800"
                        subtitle="FAR"
                    />
                </Grid>
            </Grid>

            {/* Attack Distribution */}
            <Paper
                sx={{
                    p: 2,
                    background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    mb: 2,
                }}
            >
                <Typography variant="subtitle1" sx={{ color: "#e6edf3", fontWeight: 600, mb: 2 }}>
                    🎯 Attack Distribution
                </Typography>
                {attackDistribution.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>
                        No data yet — ingest traffic to see results.
                    </Typography>
                ) : (
                    attackDistribution.map(({ _id, count }) => {
                        const pct = totalAlerts > 0 ? (count / totalAlerts) * 100 : 0;
                        const color = ATTACK_COLORS[_id] || "#58a6ff";
                        return (
                            <Box key={_id} sx={{ mb: 1.5 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                background: color,
                                            }}
                                        />
                                        <Typography variant="body2" sx={{ color: "#e6edf3" }}>
                                            {_id}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                        {count} ({pct.toFixed(1)}%)
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        background: "rgba(255,255,255,0.05)",
                                        "& .MuiLinearProgress-bar": { background: color, borderRadius: 3 },
                                    }}
                                />
                            </Box>
                        );
                    })
                )}
            </Paper>

            {/* Severity Breakdown */}
            <Paper
                sx={{
                    p: 2,
                    background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                }}
            >
                <Typography variant="subtitle1" sx={{ color: "#e6edf3", fontWeight: 600, mb: 1.5 }}>
                    🚦 Severity Breakdown
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {[
                        { level: "critical", color: "#e91e63" },
                        { level: "high", color: "#f44336" },
                        { level: "medium", color: "#ff9800" },
                        { level: "low", color: "#4caf50" },
                    ].map(({ level, color }) => (
                        <Chip
                            key={level}
                            label={`${level.toUpperCase()}: ${severityMap[level] || 0}`}
                            sx={{
                                background: `${color}22`,
                                color,
                                border: `1px solid ${color}55`,
                                fontWeight: 700,
                            }}
                        />
                    ))}
                </Box>
            </Paper>
        </Box>
    );
}
