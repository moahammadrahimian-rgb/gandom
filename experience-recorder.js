const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "experience-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const EXP_FILE = path.join(DIR, "experiences.json");

let experiences = {};

try {
  if (fs.existsSync(EXP_FILE)) experiences = JSON.parse(fs.readFileSync(EXP_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(EXP_FILE, JSON.stringify(experiences, null, 2));
}

class ExperienceRecorder {

  static record(data) {
    const { userId, category, title, description, location, feeling, rating } = data;

    if (!userId || !category || !title) {
      return { ok: false, error: "MISSING_FIELDS" };
    }

    const expId = "EXP-" + crypto.randomBytes(8).toString("hex");
    const ts = Date.now();

    // هش تجربه
    const contentHash = crypto.createHash("sha256")
      .update(JSON.stringify({ userId, category, title, description, ts }))
      .digest("hex");

    experiences[expId] = {
      expId,
      userId,
      category,
      title,
      description: description || "",
      location: location || null,
      feeling: feeling || "neutral",
      rating: parseInt(rating) || 3,
      contentHash,
      verified: false,
      reward_gdm: 0,
      createdAt: new Date(ts).toISOString()
    };

    // پاداش برای ثبت تجربه
    if (rating >= 4) {
      experiences[expId].reward_gdm = 0.1;
    }

    save();

    // Neural Bus
    try {
      const { bus, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.AUDIT, {
        type: "EXPERIENCE_RECORDED",
        data: { expId, userId, category, contentHash }
      }, "experience-recorder");
    } catch(e) {}

    return { ok: true, experience: experiences[expId] };
  }

  static verify(expId, verifierId) {
    const exp = experiences[expId];
    if (!exp) return { ok: false, error: "NOT_FOUND" };
    exp.verified = true;
    exp.verifiedBy = verifierId;
    exp.verifiedAt = new Date().toISOString();
    save();
    return { ok: true, experience: exp };
  }

  static getUserExperiences(userId) {
    return Object.values(experiences).filter(e => e.userId === userId);
  }

  static getStats() {
    const all = Object.values(experiences);
    const byCategory = {};
    for (const e of all) byCategory[e.category] = (byCategory[e.category] || 0) + 1;

    return {
      total_experiences: all.length,
      verified: all.filter(e => e.verified).length,
      total_reward_gdm: all.reduce((s, e) => s + e.reward_gdm, 0),
      by_category: byCategory
    };
  }
}

module.exports = { ExperienceRecorder };
