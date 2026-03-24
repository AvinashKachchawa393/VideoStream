/**
 * Hardhat deployment script for AlertRegistry smart contract.
 * Usage:
 *   npx hardhat run scripts/deploy.js --network <network>
 *
 * Supported networks (configure in hardhat.config.js):
 *   localhost  – local Hardhat node (npx hardhat node)
 *   sepolia    – Ethereum Sepolia testnet
 *   mainnet    – Ethereum mainnet
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying AlertRegistry with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AlertRegistry = await hre.ethers.getContractFactory("AlertRegistry");
    const registry = await AlertRegistry.deploy();
    await registry.deployed();

    console.log("AlertRegistry deployed to:", registry.address);

    // Persist the contract address for the Node.js backend
    const outputPath = path.resolve(__dirname, "../deployments.json");
    const deployments = fs.existsSync(outputPath)
        ? JSON.parse(fs.readFileSync(outputPath))
        : {};

    deployments[hre.network.name] = {
        AlertRegistry: registry.address,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2));
    console.log("Deployment info saved to", outputPath);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
