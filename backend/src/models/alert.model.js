import mongoose, { Schema } from "mongoose";

const alertSchema = new Schema(
    {
        alertId: { type: String, required: true, unique: true },
        timestamp: { type: Date, default: Date.now },
        sourceIp: { type: String, required: true },
        destinationIp: { type: String },
        sourcePort: { type: Number },
        destinationPort: { type: Number },
        protocol: { type: String },
        attackType: {
            type: String,
            enum: ["BENIGN", "DDoS", "SQL_Injection", "PortScan", "BruteForce", "Zero_Day"],
            required: true,
        },
        confidence: { type: Number, min: 0, max: 1, required: true },
        isAnomaly: { type: Boolean, default: false },
        reconstructionError: { type: Number },
        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            required: true,
        },
        probabilities: { type: Map, of: Number },
        rawFeatures: { type: Map, of: Number },
        limeExplanation: { type: Schema.Types.Mixed },
        shapExplanation: { type: Schema.Types.Mixed },
        status: {
            type: String,
            enum: ["new", "investigating", "resolved", "false_positive"],
            default: "new",
        },
        blockchainTxHash: { type: String },
        blockchainRecorded: { type: Boolean, default: false },
        resolvedAt: { type: Date },
        resolvedBy: { type: String },
        notes: { type: String },
    },
    { timestamps: true }
);

alertSchema.index({ timestamp: -1 });
alertSchema.index({ attackType: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ status: 1 });

const Alert = mongoose.model("Alert", alertSchema);

export { Alert };
