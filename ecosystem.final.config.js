module.exports = {
  apps: [
    // هسته اصلی
    { name: "Gandom-Wallet", script: "./wallet-api.js", max_memory_restart: "64M" },
    { name: "Gandom-Blockchain", script: "./server.js", max_memory_restart: "64M" },
    { name: "Gandom-P2P-Brain", script: "./node-b-chain.js", max_memory_restart: "64M" },
    { name: "Gandom-Bridge", script: "./gandom-alpha-6-bridge.js", max_memory_restart: "64M" },
    { name: "Gandom-Brain-Neural", script: "./gandom-core/neural/GANDOM-NEURAL-BRAIN-2558.js", max_memory_restart: "64M" },
    
    // هوش مصنوعی و اقتصادی
    { name: "Gandom-AI-Worker", script: "./ai-worker.js", max_memory_restart: "64M" },
    { name: "Gandom-Ads", script: "./ads-manager.js", max_memory_restart: "64M" },
    { name: "Gandom-Accountant", script: "./ai-accountant-bridge.js", max_memory_restart: "64M" },
    { name: "Gandom-Doctor", script: "./gandom-core/revival-live/NODE_RUNTIME/0f52d94de0ff2c8c__0f52d94de0ff2c8c-doctor.js", max_memory_restart: "64M" },
    { name: "Gandom-Social", script: "./gandom-core/revival-live/LAW2558_IMMUNE/c5acdbba8d653d9b__c5acdbba8d653d9b-social.js", max_memory_restart: "64M" },
    
    // لایه‌های محاسباتی و اتوماسیون جدید
    { name: "Gandom-Math-Core", script: "./math-master-runner.js", max_memory_restart: "128M" },
    { name: "Gandom-Web-Scraper", script: "./web-scraper-agent.js", max_memory_restart: "128M" },
    { name: "Gandom-Social-Agent", script: "./social-media-agent.js", max_memory_restart: "64M" }
  ]
};
