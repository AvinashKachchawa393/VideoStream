/**
 * Real-time traffic chart component.
 * Displays live network event rates (events per second) in a rolling window.
 */
import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Paper } from "@mui/material";

const MAX_POINTS = 60; // 60-second rolling window

function generateTick() {
    const benign = Math.floor(Math.random() * 80) + 20;
    const ddos = Math.floor(Math.random() * 15);
    const sql = Math.floor(Math.random() * 8);
    const other = Math.floor(Math.random() * 5);
    return { time: new Date().toLocaleTimeString(), benign, ddos, sql, other };
}

export default function TrafficChart() {
    const canvasRef = useRef(null);
    const [dataPoints, setDataPoints] = useState(() =>
        Array.from({ length: MAX_POINTS }, () => generateTick())
    );

    // Roll in a new tick every second
    useEffect(() => {
        const id = setInterval(() => {
            setDataPoints((prev) => {
                const next = [...prev.slice(1), generateTick()];
                return next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // Draw on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const maxVal = Math.max(...dataPoints.map((d) => d.benign + d.ddos + d.sql + d.other)) + 10;
        const xStep = chartW / (MAX_POINTS - 1);

        // Grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for (let g = 0; g <= 5; g++) {
            const y = padding.top + (chartH / 5) * g;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();
        }

        // Draw each series
        const series = [
            { key: "benign", color: "#4caf50", label: "Benign" },
            { key: "ddos", color: "#f44336", label: "DDoS" },
            { key: "sql", color: "#ff9800", label: "SQL Inj." },
            { key: "other", color: "#9c27b0", label: "Other" },
        ];

        series.forEach(({ key, color }) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            dataPoints.forEach((d, i) => {
                const x = padding.left + i * xStep;
                const y = padding.top + chartH - (d[key] / maxVal) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        // Y-axis label
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        for (let g = 0; g <= 5; g++) {
            const val = Math.round((maxVal / 5) * (5 - g));
            const y = padding.top + (chartH / 5) * g;
            ctx.fillText(val, padding.left - 5, y + 4);
        }

        // X-axis: show every 10th label
        ctx.textAlign = "center";
        dataPoints.forEach((d, i) => {
            if (i % 10 === 0) {
                const x = padding.left + i * xStep;
                ctx.fillText(d.time, x, height - 5);
            }
        });
    }, [dataPoints]);

    const legend = [
        { color: "#4caf50", label: "Benign" },
        { color: "#f44336", label: "DDoS" },
        { color: "#ff9800", label: "SQL Injection" },
        { color: "#9c27b0", label: "Other Attacks" },
    ];

    return (
        <Paper
            sx={{
                p: 2,
                background: "linear-gradient(135deg,#0d1117 0%,#161b22 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 2,
            }}
        >
            <Typography variant="subtitle1" sx={{ color: "#e6edf3", fontWeight: 600, mb: 1 }}>
                📡 Real-Time Network Traffic
            </Typography>
            <canvas
                ref={canvasRef}
                width={700}
                height={200}
                style={{ width: "100%", height: "200px", display: "block" }}
            />
            <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                {legend.map(({ color, label }) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                            {label}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}
