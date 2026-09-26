const express = require('express');
const cors = require('cors');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 4000;
const DB_PATH = './gandom.db';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let db = null;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run("CREATE TABLE IF NOT EXISTS ads (id TEXT PRIMARY KEY, title TEXT, description TEXT, price INTEGER, deal_type TEXT, property_type TEXT, province TEXT, city TEXT, address TEXT, owner_name TEXT, owner_phone TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  saveDB();
  return db;
}

function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function getDB() { return db; }

app.get('/api/ads', (req, res) => {
  try {
    const result = db.exec("SELECT * FROM ads ORDER BY created_at DESC");
    if (!result.length) return res.json({ success: true, ads: [] });
    const columns = result[0].columns;
    const ads = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    res.json({ success: true, ads });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/ads', (req, res) => {
  try {
    const d = req.body;
    const id = Date.now().toString();
    db.run(
      "INSERT INTO ads (id, title, description, price, deal_type, property_type, province, city, address, owner_name, owner_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, d.title, d.description, d.price, d.deal_type, d.property_type, d.province, d.city, d.address, d.owner_name, d.owner_phone]
    );
    saveDB();
    res.json({ success: true, ad: { id, ...d } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/ads/:id', (req, res) => {
  try {
    db.run("DELETE FROM ads WHERE id = ?", [req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('================================');
    console.log('  GANDOM Server is running');
    console.log('  http://localhost:' + PORT);
    console.log('================================');
  });
});
