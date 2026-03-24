// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AlertRegistry
 * @notice Immutably records IDS threat alerts on-chain for tamper-evident audit trails.
 *         Each alert is stored as an event log and an on-chain mapping.
 *         Designed for deployment on Ethereum (mainnet / testnet) or compatible EVM chains.
 */
contract AlertRegistry {
    // ─── Structs ─────────────────────────────────────────────────────────────

    struct AlertRecord {
        string  alertId;       // UUID from the IDS backend
        string  attackType;    // e.g. "DDoS", "SQL_Injection"
        string  severity;      // "low" | "medium" | "high" | "critical"
        string  sourceIp;      // hashed source IP (for privacy)
        uint256 confidence;    // confidence × 10 000 (e.g. 8750 = 87.50 %)
        bytes32 dataHash;      // keccak256 of full alert payload JSON
        uint256 timestamp;     // block.timestamp at recording time
        address recordedBy;    // address of the IDS node that submitted
        bool    resolved;      // whether the incident has been resolved
    }

    // ─── State ───────────────────────────────────────────────────────────────

    mapping(bytes32 => AlertRecord) private _records;  // alertId hash → record
    bytes32[] private _alertIds;

    address public owner;
    mapping(address => bool) public authorizedNodes;   // whitelisted IDS nodes

    uint256 public totalAlerts;
    uint256 public totalThreats;  // alerts where attackType != "BENIGN"

    // ─── Events ──────────────────────────────────────────────────────────────

    event AlertRecorded(
        bytes32 indexed alertIdHash,
        string  alertId,
        string  attackType,
        string  severity,
        bytes32 dataHash,
        uint256 timestamp
    );

    event AlertResolved(
        bytes32 indexed alertIdHash,
        string  alertId,
        address resolvedBy,
        uint256 resolvedAt
    );

    event NodeAuthorized(address indexed node, bool status);

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AlertRegistry: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedNodes[msg.sender] || msg.sender == owner,
            "AlertRegistry: caller is not authorized"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedNodes[msg.sender] = true;
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function setNodeAuthorization(address node, bool status) external onlyOwner {
        authorizedNodes[node] = status;
        emit NodeAuthorized(node, status);
    }

    // ─── Core functions ──────────────────────────────────────────────────────

    /**
     * @notice Record a new IDS alert on-chain.
     * @param alertId     UUID of the alert (from the IDS backend)
     * @param attackType  Predicted attack class
     * @param severity    Alert severity level
     * @param sourceIp    Source IP address (can be keccak256-hashed off-chain)
     * @param confidence  Model confidence × 10 000 (e.g. 9500 = 95 %)
     * @param dataHash    keccak256 hash of the full alert JSON payload
     */
    function recordAlert(
        string  calldata alertId,
        string  calldata attackType,
        string  calldata severity,
        string  calldata sourceIp,
        uint256          confidence,
        bytes32          dataHash
    ) external onlyAuthorized returns (bytes32 alertIdHash) {
        alertIdHash = keccak256(bytes(alertId));
        require(_records[alertIdHash].timestamp == 0, "AlertRegistry: alert already recorded");

        _records[alertIdHash] = AlertRecord({
            alertId:    alertId,
            attackType: attackType,
            severity:   severity,
            sourceIp:   sourceIp,
            confidence: confidence,
            dataHash:   dataHash,
            timestamp:  block.timestamp,
            recordedBy: msg.sender,
            resolved:   false
        });

        _alertIds.push(alertIdHash);
        totalAlerts++;

        // Count threats (anything that is not benign traffic)
        if (keccak256(bytes(attackType)) != keccak256(bytes("BENIGN"))) {
            totalThreats++;
        }

        emit AlertRecorded(alertIdHash, alertId, attackType, severity, dataHash, block.timestamp);
    }

    /**
     * @notice Mark an alert as resolved.
     */
    function resolveAlert(string calldata alertId) external onlyAuthorized {
        bytes32 alertIdHash = keccak256(bytes(alertId));
        require(_records[alertIdHash].timestamp != 0, "AlertRegistry: alert not found");
        require(!_records[alertIdHash].resolved, "AlertRegistry: already resolved");

        _records[alertIdHash].resolved = true;
        emit AlertResolved(alertIdHash, alertId, msg.sender, block.timestamp);
    }

    // ─── View functions ──────────────────────────────────────────────────────

    function getAlert(string calldata alertId)
        external
        view
        returns (AlertRecord memory)
    {
        bytes32 h = keccak256(bytes(alertId));
        require(_records[h].timestamp != 0, "AlertRegistry: alert not found");
        return _records[h];
    }

    function verifyAlert(string calldata alertId, bytes32 dataHash)
        external
        view
        returns (bool isValid)
    {
        bytes32 h = keccak256(bytes(alertId));
        isValid = _records[h].dataHash == dataHash;
    }

    function getTotalAlerts() external view returns (uint256) {
        return totalAlerts;
    }

    function getTotalThreats() external view returns (uint256) {
        return totalThreats;
    }
}
