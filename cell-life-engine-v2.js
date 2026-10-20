class Cell {
    constructor(id, generation, parentExperience = 0) {
        this.id = id; this.generation = generation; this.age = 0;
        this.energy = 100; this.experience = parentExperience;
        this.memory = []; this.alive = true; this.offspring = 0;
    }
    recordExperience(event, value) {
        this.memory.push({ tick: this.age, event, value });
        this.experience += value;
        if (this.memory.length > 50) this.memory.shift();
    }
    tick() {
        this.age++; this.energy -= 0.5;
        if (Math.random() < 0.1) this.recordExperience("LEARNING", 1);
        if (Math.random() < 0.05) this.recordExperience("INTERACTION", 2);
        if (this.experience > 50) this.energy += 1;
        if (this.energy <= 0 || this.age > 200) this.alive = false;
        return this.alive;
    }
}
class CellLifeEngine {
    constructor() {
        this.tick = 0; this.nextId = 1; this.cells = [];
        this.generationStats = { births: 0, deaths: 0, mutations: 0 };
        this.totalBirths = 0; this.totalDeaths = 0; this.experiencePool = 0;
        this.initialize(1000);
    }
    initialize(count) {
        for (let i = 0; i < count; i++) this.cells.push(new Cell(this.nextId++, 1));
        console.log(`🌱 موتور حیات راه‌اندازی شد با ${count} سلول اولیه`);
    }
    reproduce() {
        const newCells = [];
        this.cells.forEach(cell => {
            if (cell.alive && cell.experience > 100 && cell.energy > 60 && Math.random() < 0.05) {
                const child = new Cell(this.nextId++, cell.generation + 1, cell.experience * 0.3);
                if (cell.experience > 200) { child.energy = 120; this.generationStats.mutations++; }
                newCells.push(child); cell.offspring++; cell.energy -= 30; this.totalBirths++;
            }
        });
        this.cells = this.cells.concat(newCells);
    }
    processDeaths() {
        const alive = [];
        this.cells.forEach(cell => {
            if (cell.alive) alive.push(cell);
            else { this.totalDeaths++; this.experiencePool += cell.experience * 0.5; }
        });
        this.cells = alive;
    }
    step() {
        this.tick++;
        this.cells.forEach(cell => cell.tick());
        if (this.tick % 5 === 0) this.reproduce();
        this.processDeaths();
        if (this.cells.length > 50000) {
            this.cells.sort((a, b) => b.experience - a.experience);
            this.cells = this.cells.slice(0, 40000);
        }
        return this.getStats();
    }
    getStats() {
        const avgAge = this.cells.reduce((s, c) => s + c.age, 0) / (this.cells.length || 1);
        const avgExp = this.cells.reduce((s, c) => s + c.experience, 0) / (this.cells.length || 1);
        const maxGen = Math.max(...this.cells.map(c => c.generation), 0);
        return { tick: this.tick, alive: this.cells.length, generations: maxGen, avg_age: avgAge.toFixed(2), avg_experience: avgExp.toFixed(2), total_births: this.totalBirths, total_deaths: this.totalDeaths, mutations: this.generationStats.mutations, experience_pool: Math.round(this.experiencePool) };
    }
}
const engine = new CellLifeEngine();
setInterval(() => {
    const stats = engine.step();
    if (stats.tick % 10 === 0) console.log("🧬 [GANDOM CELL LIFE]", JSON.stringify(stats));
}, 5000);
process.on("SIGINT", () => { console.log("\n👑 پدر، موتور حیات در حال خاموش شدن است."); process.exit(0); });
