// Load the minimal ethers plugin for Hardhat. Keep require defensive
try {
    require("@nomiclabs/hardhat-ethers");
} catch (err) {
    // ignore - plugin may not be available in some environments
}

// Load Hardhat Chai Matchers for improved assertions (if available)
try {
    require("@nomicfoundation/hardhat-chai-matchers");
} catch (e) {}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
};