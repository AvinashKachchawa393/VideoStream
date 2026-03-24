/**
 * IDS Dashboard Page
 * - Real-time traffic chart
 * - Attack detection metrics
 * - Alert management table
 * - XAI explanations (LIME / SHAP)
 * - Blockchain audit trail
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    Tabs,
    Tab,
    Alert as MuiAlert,
    Snackbar,
    CircularProgress,
    Chip,
    Divider,
    IconButton,
    Tooltip,
} from "@mui/material";
import { io as socketIO } from "socket.io-client";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShieldIcon from "@mui/icons-material/Shield";
import LinkIcon from "@mui/icons-material/Link";

import TrafficChart from "../components/ids/TrafficChart";
import MetricsPanel from "../components/ids/MetricsPanel";
import AlertTable from "../components/ids/AlertTable";
import XAIExplanation from "../components/ids/XAIExplanation";
import idsApi from "../utils/idsApi";
import server from "../environment";

// ─── Mock feature vector for demo ingestion ───────────────────────────────────
function randomFeatures() {
    const src = `192.168.${randInt(1, 254)}.${randInt(1, 254)}`;
    return {
        features: {
            duration: Math.random() * 100,
            protocol_type: randInt(1, 3),
            src_bytes: randInt(0, 100000),
            dst_bytes: randInt(0, 50000),
            land: 0,
            wrong_fragment: randInt(0, 3),
            urgent: 0,
            hot: randInt(0, 30),
            num_failed_logins: randInt(0, 5),
            logged_in: randInt(0, 1),
            num_compromised: randInt(0, 20),
            root_shell: randInt(0, 1),
            su_attempted: randInt(0, 1),
            num_root: randInt(0, 10),
            num_file_creations: randInt(0, 10),
            num_shells: randInt(0, 5),
            num_access_files: randInt(0, 10),
            num_outbound_cmds: 0,
            is_host_login: randInt(0, 1),
            is_guest_login: randInt(0, 1),
            count: randInt(1, 512),
            srv_count: randInt(1, 256),
            serror_rate: Math.random(),
            srv_serror_rate: Math.random(),
            rerror_rate: Math.random(),
            srv_rerror_rate: Math.random(),
            same_srv_rate: Math.random(),
            diff_srv_rate: Math.random(),
            srv_diff_host_rate: Math.random(),
            dst_host_count: randInt(1, 255),
            dst_host_srv_count: randInt(1, 255),
            dst_host_same_srv_rate: Math.random(),
            dst_host_diff_srv_rate: Math.random(),
            dst_host_same_src_port_rate: Math.random(),
            dst_host_srv_diff_host_rate: Math.random(),
            dst_host_serror_rate: Math.random(),
            dst_host_srv_serror_rate: Math.random(),
            dst_host_rerror_rate: Math.random(),
            dst_host_srv_rerror_rate: Math.random(),
        },
        metadata: {
            src_ip: src,
            dst_ip: `10.0.${randInt(0, 255)}.${randInt(1, 254)}`,
            src_port: randInt(1024, 65535),
            dst_port: [80, 443, 22, 3306, 8080][randInt(0, 4)],
            protocol: ["TCP", "UDP", "ICMP"][randInt(0, 2)],
        },
    };
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IDSDashboard() {
    const [tab, setTab] = useState(0);
    const [stats, setStats] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [alertTotal, setAlertTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [loading, setLoading] = useState(false);
    const [ingestLoading, setIngestLoading] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [limeData, setLimeData] = useState(null);
    const [shapData, setShapData] = useState(null);
    const [liveEvents, setLiveEvents] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const socketRef = useRef(null);

    // ── Load stats & alerts ────────────────────────────────────────────────
    const loadStats = useCallback(async () => {
        try {
            const { data } = await idsApi.getStats();
            setStats(data);
        } catch {
            /* backend may not be running – silently ignore */
        }
    }, []);

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await idsApi.getAlerts({ page: page + 1, limit: rowsPerPage });
            setAlerts(data.alerts || []);
            setAlertTotal(data.pagination?.total || 0);
        } catch {
            /* silently ignore */
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        loadStats();
        loadAlerts();
    }, [loadStats, loadAlerts]);

    // ── Socket.IO for real-time new_alert events ───────────────────────────
    useEffect(() => {
        try {
            const socket = socketIO(server, { transports: ["websocket"] });
            socketRef.current = socket;
            socket.on("new_alert", (event) => {
                setLiveEvents((prev) => [event, ...prev].slice(0, 50));
                setSnackbar({
                    open: true,
                    message: `⚠️ ${event.attackType} detected from ${event.sourceIp} (${event.severity})`,
                    severity: event.severity === "critical" || event.severity === "high" ? "error" : "warning",
                });
                loadStats();
                if (page === 0) loadAlerts();
            });
            return () => socket.disconnect();
        } catch {
            /* socket may not be available */
        }
    }, [loadStats, loadAlerts, page]);

    // ── Demo: ingest one random traffic event ─────────────────────────────
    const handleIngest = async () => {
        setIngestLoading(true);
        try {
            const { features, metadata } = randomFeatures();
            const { data } = await idsApi.ingestTraffic(features, metadata);
            setSnackbar({
                open: true,
                message: `Ingested: ${data.prediction?.predicted_class} (confidence ${(data.prediction?.confidence * 100).toFixed(1)}%)`,
                severity: data.prediction?.predicted_class === "BENIGN" ? "success" : "warning",
            });
            loadStats();
            loadAlerts();
        } catch {
            setSnackbar({ open: true, message: "ML API unreachable. Start the Python api_server.py.", severity: "error" });
        } finally {
            setIngestLoading(false);
        }
    };

    // ── XAI explanation for selected alert ────────────────────────────────
    const handleAlertSelect = async (alert) => {
        setSelectedAlert(alert);
        setTab(2); // jump to XAI tab
        const rawFeatures = alert.rawFeatures || {};
        try {
            const [limeRes, shapRes] = await Promise.allSettled([
                idsApi.explainLime(rawFeatures),
                idsApi.explainShap(rawFeatures),
            ]);
            if (limeRes.status === "fulfilled") setLimeData(limeRes.value.data);
            if (shapRes.status === "fulfilled") setShapData(shapRes.value.data);
        } catch {
            /* XAI service may be down */
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "linear-gradient(180deg,#0d1117 0%,#010409 100%)",
                color: "#e6edf3",
                p: { xs: 1, md: 3 },
            }}
        >
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <ShieldIcon sx={{ fontSize: 36, color: "#58a6ff" }} />
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, color: "#e6edf3" }}>
                            AI-Powered Intrusion Detection System
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                            CNN + LSTM + Random Forest · LSTM Autoencoder · LIME · SHAP · Blockchain
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Refresh data">
                        <IconButton onClick={() => { loadStats(); loadAlerts(); }} sx={{ color: "rgba(255,255,255,0.5)" }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleIngest}
                        disabled={ingestLoading}
                        sx={{
                            background: "#238636",
                            "&:hover": { background: "#2ea043" },
                            textTransform: "none",
                        }}
                    >
                        {ingestLoading ? <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} /> : null}
                        Simulate Traffic Event
                    </Button>
                </Box>
            </Box>

            {/* Live event ticker */}
            {liveEvents.length > 0 && (
                <Box
                    sx={{
                        display: "flex",
                        gap: 1,
                        overflowX: "auto",
                        mb: 2,
                        pb: 0.5,
                        "&::-webkit-scrollbar": { height: 4, background: "transparent" },
                        "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.1)", borderRadius: 2 },
                    }}
                >
                    {liveEvents.slice(0, 10).map((e, i) => (
                        <Chip
                            key={i}
                            label={`${e.attackType} — ${e.sourceIp}`}
                            size="small"
                            sx={{
                                background: e.severity === "critical" ? "#e91e6322" : "#f4433622",
                                color: e.severity === "critical" ? "#e91e63" : "#f44336",
                                border: `1px solid ${e.severity === "critical" ? "#e91e6344" : "#f4433644"}`,
                                fontSize: "0.68rem",
                                flexShrink: 0,
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Tabs */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    mb: 2,
                    "& .MuiTab-root": { color: "rgba(255,255,255,0.5)", textTransform: "none", minHeight: 40 },
                    "& .Mui-selected": { color: "#58a6ff" },
                    "& .MuiTabs-indicator": { background: "#58a6ff" },
                }}
            >
                <Tab label="📊 Dashboard" />
                <Tab label="🚨 Alerts" />
                <Tab label="🔍 XAI" />
                <Tab label="⛓️ Blockchain" />
            </Tabs>

            {/* Tab 0: Dashboard */}
            {tab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TrafficChart liveEvents={liveEvents} />
                    </Grid>
                    <Grid item xs={12}>
                        <MetricsPanel stats={stats} />
                    </Grid>
                </Grid>
            )}

            {/* Tab 1: Alerts */}
            {tab === 1 && (
                <Box>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                            <CircularProgress sx={{ color: "#58a6ff" }} />
                        </Box>
                    ) : (
                        <AlertTable
                            alerts={alerts}
                            total={alertTotal}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={(_, p) => setPage(p)}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            onAlertSelect={handleAlertSelect}
                        />
                    )}
                </Box>
            )}

            {/* Tab 2: XAI */}
            {tab === 2 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <XAIExplanation limeData={limeData} shapData={null} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <XAIExplanation limeData={null} shapData={shapData} />
                    </Grid>
                    {selectedAlert && (
                        <Grid item xs={12}>
                            <Paper
                                sx={{
                                    p: 2,
                                    background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.5)", mb: 1 }}>
                                    Selected Alert Details
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                    {[
                                        ["Alert ID", selectedAlert.alertId?.slice(0, 8) + "…"],
                                        ["Source IP", selectedAlert.sourceIp],
                                        ["Attack Type", selectedAlert.attackType],
                                        ["Confidence", `${(selectedAlert.confidence * 100).toFixed(1)}%`],
                                        ["Severity", selectedAlert.severity],
                                        ["Anomaly", selectedAlert.isAnomaly ? "Yes" : "No"],
                                    ].map(([label, val]) => (
                                        <Box key={label}>
                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>{label}</Typography>
                                            <Typography variant="body2" sx={{ color: "#e6edf3", fontWeight: 600 }}>{val}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Tab 3: Blockchain */}
            {tab === 3 && (
                <Paper
                    sx={{
                        p: 3,
                        background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 2,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                        <LinkIcon sx={{ color: "#58a6ff" }} />
                        <Typography variant="h6" sx={{ color: "#e6edf3", fontWeight: 600 }}>
                            Blockchain Audit Trail
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 2 }}>
                        Every threat alert is immutably recorded on the blockchain via smart contracts
                        (Ethereum / Hyperledger Fabric). This ensures tamper-evident audit logs for
                        forensic analysis and compliance reporting.
                    </Typography>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />
                    <Grid container spacing={2}>
                        {[
                            { label: "Network", value: "Ethereum (Simulated)" },
                            { label: "Smart Contract", value: "AlertRegistry.sol" },
                            { label: "Hash Algorithm", value: "SHA-256 / keccak256" },
                            { label: "Storage Model", value: "Event-log immutability" },
                        ].map(({ label, value }) => (
                            <Grid item xs={12} sm={6} key={label}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                                        {label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#58a6ff", fontFamily: "monospace" }}>
                                        {value}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                            Recent Blockchain Transactions (from live alerts)
                        </Typography>
                        {alerts.filter((a) => a.blockchainRecorded).slice(0, 5).map((a) => (
                            <Box
                                key={a.alertId}
                                sx={{
                                    mt: 1,
                                    p: 1.5,
                                    background: "rgba(88,166,255,0.05)",
                                    border: "1px solid rgba(88,166,255,0.15)",
                                    borderRadius: 1,
                                    fontFamily: "monospace",
                                }}
                            >
                                <Typography variant="caption" sx={{ color: "#58a6ff", display: "block" }}>
                                    TX: {a.blockchainTxHash}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                    Alert: {a.alertId} · Type: {a.attackType} · {new Date(a.timestamp).toLocaleString()}
                                </Typography>
                            </Box>
                        ))}
                        {alerts.filter((a) => a.blockchainRecorded).length === 0 && (
                            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", mt: 1 }}>
                                No blockchain records yet. Ingest threat traffic to create records.
                            </Typography>
                        )}
                    </Box>
                </Paper>
            )}

            {/* Snackbar notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <MuiAlert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    sx={{ background: "#161b22", color: "#e6edf3" }}
                >
                    {snackbar.message}
                </MuiAlert>
            </Snackbar>
        </Box>
    );
}
