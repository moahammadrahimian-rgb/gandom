// ═══════════════════════════════════════════════════════
// 🎯 WORKER COORDINATOR - هماهنگ‌کننده نودهای پردازشگر
// ═══════════════════════════════════════════════════════
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "workers-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const WORKERS_FILE = path.join(DIR, "workers.json");
const TASKS_FILE = path.join(DIR, "tasks.json");

let workers = {};
let tasks = {};
let taskCounter = 0;

try {
  if (fs.existsSync(WORKERS_FILE)) workers = JSON.parse(fs.readFileSync(WORKERS_FILE, "utf8"));
  if (fs.existsSync(TASKS_FILE)) tasks = JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(WORKERS_FILE, JSON.stringify(workers, null, 2));
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

class WorkerCoordinator {

  // ─── ثبت worker جدید ───
  static registerWorker(info, ws) {
    const id = info.worker_id;
    workers[id] = {
      worker_id: id,
      capabilities: info.capabilities || [],
      platform: info.platform || "unknown",
      arch: info.arch || "unknown",
      cores: info.cores || 1,
      memory_mb: info.memory_mb || 0,
      registered_at: new Date().toISOString(),
      last_ping: Date.now(),
      tasks_completed: 0,
      tasks_failed: 0,
      status: "ONLINE",
      ws: ws
    };
    save();
    console.log("🖥️  Worker ثبت شد: " + id + " (" + (info.capabilities || []).join(",") + ")");
    return workers[id];
  }

  // ─── حذف worker ───
  static unregisterWorker(id) {
    if (workers[id]) {
      workers[id].status = "OFFLINE";
      workers[id].ws = null;
      save();
      console.log("🔌 Worker قطع شد: " + id);
    }
  }

  // ─── به‌روزرسانی ping ───
  static updatePing(id, data) {
    if (workers[id]) {
      workers[id].last_ping = Date.now();
      workers[id].tasks_completed = data.tasks_completed || 0;
      workers[id].tasks_failed = data.tasks_failed || 0;
      workers[id].uptime_sec = data.uptime_sec || 0;
      save();
    }
  }

  // ─── انتخاب بهترین worker برای یه task ───
  static selectWorker(taskType) {
    const now = Date.now();
    const alive = Object.values(workers).filter(w => {
      return w.status === "ONLINE" && (now - w.last_ping) < 60000;
    });

    if (alive.length === 0) return null;

    // فیلتر بر اساس قابلیت
    const capable = alive.filter(w => {
      if (taskType === "PROCESS_CELLS" && w.capabilities.includes("cells")) return true;
      if (taskType === "AI_TASK" && w.capabilities.includes("ai")) return true;
      if (taskType === "HASH_COMPUTE" && w.capabilities.includes("compute")) return true;
      if (w.capabilities.includes("compute")) return true;
      return false;
    });

    if (capable.length === 0) return alive[0];

    // مرتب‌سازی بر اساس بار (کمترین کار = بهترین)
    capable.sort((a, b) => a.tasks_completed - b.tasks_completed);

    return capable[0];
  }

  // ─── ارسال task به worker ───
  static assignTask(taskType, params) {
    const worker = this.selectWorker(taskType);
    if (!worker) {
      return { ok: false, error: "NO_WORKER_AVAILABLE" };
    }

    const taskId = "TASK-" + (++taskCounter) + "-" + crypto.randomBytes(3).toString("hex");
    const task = {
      task_id: taskId,
      task_type: taskType,
      params: params || {},
      assigned_to: worker.worker_id,
      status: "ASSIGNED",
      created_at: Date.now()
    };

    tasks[taskId] = task;
    save();

    // ارسال به worker
    try {
      worker.ws.send(JSON.stringify({
        type: "TASK_ASSIGNED",
        payload: task
      }));
      console.log("📤 Task ارسال شد: " + taskType + " → " + worker.worker_id);
    } catch(e) {
      task.status = "FAILED";
      save();
      return { ok: false, error: e.message };
    }

    return { ok: true, task_id: taskId, worker: worker.worker_id };
  }

  // ─── دریافت نتیجه ───
  static receiveResult(data) {
    const taskId = data.task_id;
    if (!tasks[taskId]) return;

    tasks[taskId].status = data.success ? "COMPLETED" : "FAILED";
    tasks[taskId].completed_at = Date.now();
    tasks[taskId].result = data.result;
    tasks[taskId].duration_ms = data.duration_ms;
    tasks[taskId].error = data.error;

    if (data.success) {
      console.log("✅ نتیجه: " + tasks[taskId].task_type + " از " + data.worker_id);
    } else {
      console.log("❌ شکست: " + tasks[taskId].task_type);
    }

    save();
  }

  // ─── ارسال task به همه workerها (Parallel) ───
  static broadcastTask(taskType, params) {
    const alive = Object.values(workers).filter(w => w.status === "ONLINE");
    if (alive.length === 0) return { ok: false, error: "NO_WORKERS" };

    const results = [];
    for (const w of alive) {
      const taskId = "TASK-" + (++taskCounter) + "-" + crypto.randomBytes(3).toString("hex");
      tasks[taskId] = {
        task_id: taskId,
        task_type: taskType,
        params: params || {},
        assigned_to: w.worker_id,
        status: "ASSIGNED",
        created_at: Date.now()
      };
      try {
        w.ws.send(JSON.stringify({
          type: "TASK_ASSIGNED",
          payload: tasks[taskId]
        }));
        results.push({ worker: w.worker_id, task_id: taskId });
      } catch(e) {}
    }
    save();
    console.log("📡 Broadcast: " + taskType + " به " + results.length + " worker");
    return { ok: true, sent: results.length, tasks: results };
  }

  // ─── آمار ───
  static getStats() {
    const now = Date.now();
    const all = Object.values(workers);
    const alive = all.filter(w => w.status === "ONLINE" && (now - w.last_ping) < 60000);
    const taskList = Object.values(tasks);

    return {
      total_workers: all.length,
      alive_workers: alive.length,
      offline_workers: all.length - alive.length,
      total_tasks: taskList.length,
      completed_tasks: taskList.filter(t => t.status === "COMPLETED").length,
      failed_tasks: taskList.filter(t => t.status === "FAILED").length,
      pending_tasks: taskList.filter(t => t.status === "ASSIGNED").length,
      workers: all.map(w => ({
        id: w.worker_id,
        status: w.status,
        caps: w.capabilities,
        completed: w.tasks_completed,
        failed: w.tasks_failed,
        last_ping_ago: Math.floor((now - w.last_ping) / 1000) + "s"
      }))
    };
  }
}

module.exports = { WorkerCoordinator };
