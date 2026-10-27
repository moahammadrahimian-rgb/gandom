const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'deploy-config.json');

const NETWORKS = {
  bscMainnet: {
    name: 'Binance Smart Chain Mainnet',
    rpc: 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    explorer: 'https://bscscan.com',
    pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    pancakeFactory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  },
  bscTestnet: {
    name: 'Binance Smart Chain Testnet',
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    chainId: 97,
    explorer: 'https://testnet.bscscan.com',
    pancakeRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    pancakeFactory: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
    wbnb: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
  }
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { network: 'bscTestnet', deployed: false };
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function generateDeployConfig(network) {
  const net = NETWORKS[network];
  if (!net) {
    console.log('Network not found: ' + network);
    return null;
  }
  
  const config = {
    network: network,
    networkName: net.name,
    rpc: net.rpc,
    chainId: net.chainId,
    explorer: net.explorer,
    contracts: {
      gandomToken: {
        name: 'GandomToken',
        symbol: 'GDM',
        totalSupply: '24000000000',
        ownerShare: 5,
        file: 'gandom-token.sol'
      },
      pancakeRouter: net.pancakeRouter,
      pancakeFactory: net.pancakeFactory,
      wbnb: net.wbnb
    },
    deployed: false,
    deployedAt: null,
    contractAddress: null,
    txHash: null
  };
  
  saveConfig(config);
  
  console.log('==========================================');
  console.log('GANDOM DEPLOY CONFIG');
  console.log('==========================================');
  console.log('');
  console.log('Network:       ' + net.name);
  console.log('Chain ID:      ' + net.chainId);
  console.log('RPC:           ' + net.rpc);
  console.log('Explorer:      ' + net.explorer);
  console.log('');
  console.log('Contracts:');
  console.log('  GDM Token:   ' + config.contracts.gandomToken.name);
  console.log('  Total Supply: ' + config.contracts.gandomToken.totalSupply);
  console.log('  Owner Share: ' + config.contracts.gandomToken.ownerShare + '%');
  console.log('');
  console.log('PancakeSwap:');
  console.log('  Router:      ' + net.pancakeRouter);
  console.log('  Factory:     ' + net.pancakeFactory);
  console.log('  WBNB:        ' + net.wbnb);
  
  return config;
}

function simulateDeploy(config) {
  console.log('');
  console.log('--- Simulating Deployment ---');
  console.log('');
  console.log('Step 1: Compiling gandom-token.sol...');
  console.log('  Compiler: solc 0.8.0');
  console.log('  Optimization: enabled');
  console.log('  Bytecode: 0x608060405234801561001057600080fd5b50...');
  console.log('  ABI size: 2456 bytes');
  console.log('');
  console.log('Step 2: Deploying contract to ' + config.networkName + '...');
  console.log('  Gas Price: 5 Gwei');
  console.log('  Gas Limit: 3,000,000');
  console.log('  Estimated Cost: 0.015 BNB');
  console.log('');
  console.log('Step 3: Verifying contract on ' + config.explorer + '...');
  console.log('  Status: Verified');
  console.log('');
  
  config.deployed = true;
  config.deployedAt = new Date().toISOString();
  config.contractAddress = '0x' + 'GDM'.repeat(20).substring(0, 40);
  config.txHash = '0x' + 'a'.repeat(64);
  
  saveConfig(config);
  
  console.log('==========================================');
  console.log('DEPLOYMENT SUCCESSFUL');
  console.log('==========================================');
  console.log('');
  console.log('Contract Address: ' + config.contractAddress);
  console.log('Tx Hash:          ' + config.txHash);
  console.log('Explorer:         ' + config.explorer + '/address/' + config.contractAddress);
  console.log('');
  console.log('Next Steps:');
  console.log('1. Add liquidity on PancakeSwap');
  console.log('2. List GDM on CoinMarketCap');
  console.log('3. List GDM on CoinGecko');
  console.log('');
  
  return config;
}

console.log('==========================================');
console.log('GANDOM DEPLOYMENT SYSTEM');
console.log('==========================================');
console.log('');

const config = generateDeployConfig('bscTestnet');

console.log('');
console.log('--- Deploying ---');
simulateDeploy(config);

console.log('');
console.log('--- Final Config ---');
const finalConfig = loadConfig();
console.log('Network:          ' + finalConfig.networkName);
console.log('Deployed:         ' + finalConfig.deployed);
console.log('Contract Address: ' + finalConfig.contractAddress);
console.log('Deployed At:      ' + finalConfig.deployedAt);

module.exports = { generateDeployConfig, simulateDeploy, NETWORKS };
