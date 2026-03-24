import mongoose, { Schema } from "mongoose";

/**
 * Blockchain record model – stores the on-chain hash / transaction ID
 * that anchors each IDS alert for tamper-evident audit trails.
 * Simulates Ethereum / Hyperledger Fabric smart-contract event storage.
 */
const blockchainRecordSchema = new Schema(
    {
        alertId: { type: String, required: true, index: true },
        txHash: { type: String, required: true, unique: true },
        blockNumber: { type: Number },
        network: { type: String, default: "ethereum-simulated" },
        contractAddress: { type: String },
        dataHash: { type: String, required: true },   // keccak256 / SHA-256 of alert payload
        timestamp: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["pending", "confirmed", "failed"],
            default: "pending",
        },
        gasUsed: { type: Number },
        confirmations: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const BlockchainRecord = mongoose.model("BlockchainRecord", blockchainRecordSchema);

export { BlockchainRecord };
