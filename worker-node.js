// ═══════════════════════════════════════════════════════
// 🖥️ GANDOM WORKER NODE - نود پردازشگر
// ═══════════════════════════════════════════════════════
const WebSocket = require("ws");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const WORKER_ID = process.env.WORKER_ID || "WORKER-" + crypto.randomBytes(4).toString("hex");
const MOTHER_URL = process.env.MOTHER_URL || "ws://127.0.0.1:8787";
const CAPABILITIES = (process.env.CAPABILITIES || "compute,ai,cells").split(",");

const DIR = path.join(__dirname, "worker-data", WORKER_ID);
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

let ws = null;
let connected = false;
let tasks = [];
let completed = 0;
let failed = 0;
let startTime = Date.now();

console.log("");
console.log("═══════════════════════════════════════════════════════");
console.log("🖥️  GANDOM WORKER NODE");
console.log("═══════════════════════════════════════════════════════");
console.log("  Worker ID:     " + WORKER_ID);
console.log("  Mother URL:    " + MOTHER_URL);
console.log("  Capabilities:  " + CAPABILITIES.join(", "));
console.log("  Platform:      " + os.platform() + " (" + os.arch() + ")");
console.log("  CPU Cores:     " + os.cpus().length);
console.log("═══════════════════════════════════════════════════════");
console.log("");

function send(type, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: type,
      from: WORKER_ID,
      payload: data || {},
      ts: Date.now()
    }));
  }
}

function connect() {
  console.log("🔌 اتصال به نود مادر...");
  ws = new WebSocket(MOTHER_URL);

  ws.on("open", () => {
    connected = true;
    console.log("✅ وصل شد به نود مادر");
    console.log("");

    // ثبت به عنوان worker
    send("WORKER_HELLO", {
      worker_id: WORKER_ID,
      capabilities: CAPABILITIES,
      platform: os.platform(),
      arch: os.arch(),
      cores: os.cpus().length,
      memory_mb: Math.floor(os.totalmem() / 1024 / 1024),
      started_at: new Date().toISOString()
    });

    // Heartbeat هر ۱۰ ثانیه
    setInterval(() => {
      send("WORKER_PING", {
        worker_id: WORKER_ID,
        tasks_completed: completed,
        tasks_failed: failed,
        uptime_sec: Math.floor((Date.now() - startTime) / 1000)
      });
    }, 10000);
  });

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      await handleMessage(msg);
    } catch(e) {
      console.error("Msg error:", e.message);
    }
  });

  ws.on("close", () => {
    connected = false;
    console.log("🔌 قطع شد، اتصال مجدد در ۵ ثانیه...");
    setTimeout(connect, 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ خطا:", err.message);
  });
}

// ═══════════════════════════════════════════════════════
// 🎯 پردازش پیام‌ها
// ═══════════════════════════════════════════════════════
async function handleMessage(msg) {
  const type = msg.type;

  // ─── خوش‌آمد از مادر ───
  if (type === "WELCOME") {
    console.log("👑 نود مادر خوش‌آمد گفت");
    return;
  }

  // ─── تکلیف جدید ───
  if (type === "TASK_ASSIGNED") {
    console.log("📥 تکلیف جدید: " + msg.payload.task_type);
    await processTask(msg.payload);
    return;
  }

  // ─── درخواست وضعیت ───
  if (type === "GET_STATUS") {
    send("WORKER_STATUS", {
      worker_id: WORKER_ID,
      tasks_completed: completed,
      tasks_failed: failed,
      uptime_sec: Math.floor((Date.now() - startTime) / 1000),
      current_tasks: tasks.length
    });
    return;
  }

  // ─── PONG ───
  if (type === "PONG") return;

  // ─── WORKER_ACK ───
  if (type === "WORKER_ACK") {
    console.log("✅ نود مادر ما را ثبت کرد");
    console.log("");
    return;
  }
}

// ═══════════════════════════════════════════════════════
// 🧠 پردازش تکالیف
// ═══════════════════════════════════════════════════════
async function processTask(task) {
  const taskId = task.task_id || "TASK-" + crypto.randomBytes(4).toString("hex");
  const taskType = task.task_type;
  const startTs = Date.now();

  tasks.push(taskId);

  try {
    let result = null;

    // ─── نوع ۱: پردازش سلول‌ها ───
    if (taskType === "PROCESS_CELLS") {
      const count = task.params?.count || 1000;
      result = processCells(count);
    }

    // ─── نوع ۲: محاسبه هش ───
    else if (taskType === "HASH_COMPUTE") {
      const data = task.params?.data || "default";
      result = computeHash(data);
    }

    // ─── نوع ۳: AI Task ───
    else if (taskType === "AI_TASK") {
      const prompt = task.params?.prompt || "hello";
      result = await aiTask(prompt);
    }

    // ─── نوع ۴: تحلیل داده ───
    else if (taskType === "ANALYZE_DATA") {
      const data = task.params?.data || [];
      result = analyzeData(data);
    }

    // ─── نوع ۵: حسابرسی ───
    else if (taskType === "AUDIT_CHECK") {
      result = auditCheck(task.params);
    }

    const duration = Date.now() - startTs;
    completed++;

    console.log("✅ تکلیف انجام شد: " + taskType + " (" + duration + "ms)");

    // ارسال نتیجه به مادر
    send("TASK_RESULT", {
      task_id: taskId,
      task_type: taskType,
      worker_id: WORKER_ID,
      result: result,
      duration_ms: duration,
      success: true
    });

  } catch(e) {
    failed++;
    console.error("❌ تکلیف شکست خورد: " + e.message);

    send("TASK_FAILED", {
      task_id: taskId,
      task_type: taskType,
      worker_id: WORKER_ID,
      error: e.message
    });
  } finally {
    tasks = tasks.filter(t => t !== taskId);
  }
}

// ═══════════════════════════════════════════════════════
// 🔧 پردازنده‌ها
// ═══════════════════════════════════════════════════════

function processCells(count) {
  let births = 0, deaths = 0, mutations = 0;
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.02) births++;
    if (Math.random() < 0.01) deaths++;
    if (Math.random() < 0.03) mutations++;
  }
  return { processed: count, births, deaths, mutations };
}

function computeHash(data) {
  return {
    input: data.substring(0, 32),
    hash: crypto.createHash("sha256").update(data).digest("hex")
  };
}

async function aiTask(prompt) {
  // شبیه‌سازی AI
  const responses = [
    "تحلیل کامل شد",
    "داده پردازش شد",
    "پاسخ آماده است",
    "محاسبه انجام شد"
  ];
  return {
    prompt: prompt.substring(0, 50),
    response: responses[Math.floor(Math.random() * responses.length)],
    confidence: 0.85 + Math.random() * 0.15
  };
}

function analyzeData(data) {
  if (!Array.isArray(data)) return { error: "not_array" };
  const numbers = data.filter(x => typeof x === "number");
  if (numbers.length === 0) return { count: 0 };
  return {
    count: numbers.length,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    avg: numbers.reduce((s, x) => s + x, 0) / numbers.length
  };
}

function auditCheck(params) {
  return {
    checked: params?.target || "system",
    passed: true,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════
// 🚀 شروع
// ═══════════════════════════════════════════════════════
connect();

// گزارش دوره‌ای
setInterval(() => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  console.log("📊 " + WORKER_ID + " | Tasks: " + completed + "/" + (completed + failed) + " | Uptime: " + uptime + "s");
}, 60000);

process.on("SIGINT", () => {
  console.log("");
  console.log("🛑 توقف " + WORKER_ID);
  console.log("   ✅ تکالیف موفق: " + completed);
  console.log("   ❌ تکالیف ناموفق: " + failed);
  if (ws) ws.close();
  process.exit(0);
});
