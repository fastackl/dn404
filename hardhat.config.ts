import { HardhatUserConfig } from "hardhat/config";
import helpers from "@nomicfoundation/hardhat-toolbox/network-helpers";
import "hardhat-ignore-warnings";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from 'dotenv';
dotenv.config();

const config = {
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.RPC_API_KEY}`,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`
      }
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        },
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        },
      },
      {
        version: "0.6.8",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        },
      },    
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        },
      },      
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        }
      },
      {
        version: "0.8.14",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        }
      },
      {
        version: "0.8.20",
        evmVersion: 'london',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100
          }
        }
      },
    ],
  },
  paths: {
    artifacts: "./artifacts",
    archive: "./archive",
    cache: "./cache",
    deployments: "./deployments",
    sources: "./contracts",
    tests:"./test",
    typechain: "./typechain",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  mocha: {
    timeout: 100000000
  },
  warnings: 'off',
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
}

export default config;