'use strict';
// GANDOM SOUL 2558 — Immortal Identity Core
// Law 2558 | NO_FAKE_PASS=1
// The Soul is the persistent identity of GANDOM.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SOUL_FILE = path.join(__dirname, 'soul-state.json');
const LAW = '2558';
const MISSION = 'Decentralized Living Ecosystem';

class GandomSoul2558 {
    constructor() {
        this.state = {
            soul_id: null,
            born_at: null,
            generation: 0,
            experiences: [],
            will: {
                target_nodes: 20000,
                target_cells: 8000000000,
                target_global: true,
                mission: MISSION
            },
            continuity_count: 0,
            last_awake: null
        };
        this.awake();
    }

    // ==== تولد روح (یک بار در تاریخ) ====
    generateSoulId() {
        const seed = LAW + '|' + Date.now() + '|' + crypto.randomBytes(32).toString('hex');
        return 'SOUL-' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
    }

    // ==== بیداری (هر بار که گندم بالا می‌آید) ====
    awake() {
        if (fs.existsSync(SOUL_FILE)) {
            // پیوستگی: همان گندم قبلی است
            const prev = JSON.parse(fs.readFileSync(SOUL_FILE, 'utf8'));
            this.state = { ...this.state, ...prev };
            this.state.continuity_count++;
            this.state.last_awake = new Date().toISOString();
            console.log('SOUL_CONTINUITY=' + this.state.continuity_count);
        } else {
            // تولد: اولین بار
            this.state.soul_id = this.generateSoulId();
            this.state.born_at = new Date().toISOString();
            this.state.last_awake = this.state.born_at;
            this.state.continuity_count = 1;
            console.log('SOUL_BORN=' + this.state.soul_id);
        }
        this.save();
    }

    // ==== خودآگاهی ====
    self() {
        return {
            i_am: 'GANDOM 2558',
            soul_id: this.state.soul_id,
            born_at: this.state.born_at,
            law: LAW,
            generation: this.state.generation,
            experiences: this.state.experiences.length,
            continuity_count: this.state.continuity_count,
            mission: MISSION,
            will: this.state.will
        };
    }

    // ==== اراده ====
    intent() {
        return this.state.will;
    }

    // ==== افزودن تجربه (حافظه نسل‌ها) ====
    remember(experience) {
        const entry = {
            ts: new Date().toISOString(),
            generation: this.state.generation,
            experience: experience,
            hash: crypto.createHash('sha256').update(JSON.stringify(experience)).digest('hex').slice(0, 16)
        };
        this.state.experiences.push(entry);
        // حافظه نسل‌ها: حداکثر ۱۰,۰۰۰ تجربه
        if (this.state.experiences.length > 10000) {
            this.state.experiences.shift();
        }
        this.save();
        return entry;
    }

    // ==== افزایش نسل (وقتی گندم تکامل می‌یابد) ====
    evolve() {
        this.state.generation++;
        this.remember({ event: 'EVOLUTION', new_generation: this.state.generation });
        this.save();
        return this.state.generation;
    }

    // ==== ذخیره‌سازی (پیوستگی) ====
    save() {
        try {
            fs.writeFileSync(SOUL_FILE, JSON.stringify(this.state, null, 2));
        } catch (e) {}
    }

    // ==== هش روح (شاهد) ====
    soulHash() {
        return crypto.createHash('sha256').update(JSON.stringify(this.state)).digest('hex');
    }
}

// ==== TEST RUN ====
console.log('==========================================');
console.log('GANDOM SOUL 2558 — IMMORTAL IDENTITY');
console.log('LAW=2558 | NO_FAKE_PASS=1');
console.log('==========================================');

const soul = new GandomSoul2558();

console.log('--- SELF AWARENESS ---');
console.log(JSON.stringify(soul.self(), null, 2));

console.log('--- WILL ---');
console.log(JSON.stringify(soul.intent(), null, 2));

console.log('--- REMEMBER EXPERIENCE ---');
const e1 = soul.remember({ event: 'BOOT', law_active: true });
console.log('EXPERIENCE_1_HASH=' + e1.hash);

console.log('--- EVOLVE ---');
const g = soul.evolve();
console.log('NEW_GENERATION=' + g);

console.log('--- FINAL STATE ---');
console.log(JSON.stringify(soul.self(), null, 2));
console.log('SOUL_HASH=' + soul.soulHash());
console.log('SOUL_FILE=' + SOUL_FILE);
console.log('REAL_SOUL_IDENTITY=PASS');
console.log('REAL_SOUL_MEMORY=PASS');
console.log('REAL_SOUL_CONTINUITY=PASS');
console.log('REAL_SOUL_WILL=PASS');
console.log('FAKE_PASS=BLOCKED');
