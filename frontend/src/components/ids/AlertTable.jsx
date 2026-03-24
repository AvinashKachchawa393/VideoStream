/**
 * AlertTable – paginated list of IDS alerts with status management.
 */
import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Tooltip,
    TablePagination,
    Menu,
    MenuItem,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import idsApi from "../../utils/idsApi";

const SEVERITY_COLOR = {
    critical: "#e91e63",
    high: "#f44336",
    medium: "#ff9800",
    low: "#4caf50",
};

const ATTACK_COLOR = {
    BENIGN: "#4caf50",
    DDoS: "#f44336",
    SQL_Injection: "#ff9800",
    PortScan: "#03a9f4",
    BruteForce: "#9c27b0",
    Zero_Day: "#e91e63",
};

const STATUS_COLOR = {
    new: "#58a6ff",
    investigating: "#ff9800",
    resolved: "#4caf50",
    false_positive: "rgba(255,255,255,0.3)",
};

export default function AlertTable({ alerts = [], total = 0, page, rowsPerPage,
    onPageChange, onRowsPerPageChange, onAlertSelect }) {

    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    const handleMenuOpen = (e, alertId) => {
        setAnchorEl(e.currentTarget);
        setSelectedId(alertId);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedId(null);
    };

    const handleStatusChange = async (status) => {
        if (!selectedId) return;
        try {
            await idsApi.updateAlert(selectedId, { status });
        } catch (err) {
            console.error("Failed to update alert status", err);
        }
        handleMenuClose();
    };

    return (
        <Paper
            sx={{
                background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 2,
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ color: "#e6edf3", fontWeight: 600 }}>
                    🚨 Alert Log
                </Typography>
            </Box>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ "& th": { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" } }}>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Source IP</TableCell>
                            <TableCell>Attack Type</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Confidence</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {alerts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", py: 3 }}>
                                        No alerts yet. Ingest traffic to begin detection.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            alerts.map((alert) => {
                                const color = ATTACK_COLOR[alert.attackType] || "#58a6ff";
                                const sevColor = SEVERITY_COLOR[alert.severity] || "#58a6ff";
                                return (
                                    <TableRow
                                        key={alert.alertId}
                                        sx={{
                                            "& td": { borderColor: "rgba(255,255,255,0.05)", color: "#e6edf3", fontSize: "0.78rem" },
                                            "&:hover": { background: "rgba(255,255,255,0.03)", cursor: "pointer" },
                                        }}
                                        onClick={() => onAlertSelect && onAlertSelect(alert)}
                                    >
                                        <TableCell>
                                            {new Date(alert.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: "monospace" }}>
                                            {alert.sourceIp}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={alert.attackType}
                                                size="small"
                                                sx={{
                                                    background: `${color}22`,
                                                    color,
                                                    border: `1px solid ${color}44`,
                                                    fontSize: "0.68rem",
                                                    height: 20,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={alert.severity}
                                                size="small"
                                                sx={{
                                                    background: `${sevColor}22`,
                                                    color: sevColor,
                                                    border: `1px solid ${sevColor}44`,
                                                    fontSize: "0.68rem",
                                                    height: 20,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {(alert.confidence * 100).toFixed(1)}%
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={alert.status}
                                                size="small"
                                                sx={{
                                                    background: `${STATUS_COLOR[alert.status]}22`,
                                                    color: STATUS_COLOR[alert.status],
                                                    fontSize: "0.68rem",
                                                    height: 20,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Tooltip title="View details">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: "rgba(255,255,255,0.5)" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onAlertSelect && onAlertSelect(alert);
                                                        }}
                                                    >
                                                        <InfoOutlinedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: "rgba(255,255,255,0.5)" }}
                                                    onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, alert.alertId); }}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={onPageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={onRowsPerPageChange}
                rowsPerPageOptions={[10, 20, 50]}
                sx={{ color: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            />

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{ sx: { background: "#161b22", border: "1px solid rgba(255,255,255,0.1)" } }}
            >
                {["new", "investigating", "resolved", "false_positive"].map((s) => (
                    <MenuItem
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        sx={{ color: STATUS_COLOR[s], fontSize: "0.82rem" }}
                    >
                        Mark as {s.replace("_", " ")}
                    </MenuItem>
                ))}
            </Menu>
        </Paper>
    );
}
