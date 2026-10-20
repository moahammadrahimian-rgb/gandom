const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "music-data");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
const TRACKS_FILE = path.join(DIR, "tracks.json");
const LISTENS_FILE = path.join(DIR, "listens.json");
const EARNINGS_FILE = path.join(DIR, "earnings.json");

let tracks = {};
let listens = [];
let earnings = { total_gdm: 0, by_user: {}, by_track: {} };

try {
  if (fs.existsSync(TRACKS_FILE)) tracks = JSON.parse(fs.readFileSync(TRACKS_FILE, "utf8"));
  if (fs.existsSync(LISTENS_FILE)) listens = JSON.parse(fs.readFileSync(LISTENS_FILE, "utf8"));
  if (fs.existsSync(EARNINGS_FILE)) earnings = JSON.parse(fs.readFileSync(EARNINGS_FILE, "utf8"));
} catch(e) {}

function save() {
  fs.writeFileSync(TRACKS_FILE, JSON.stringify(tracks, null, 2));
  fs.writeFileSync(LISTENS_FILE, JSON.stringify(listens.slice(-10000), null, 2));
  fs.writeFileSync(EARNINGS_FILE, JSON.stringify(earnings, null, 2));
}

class MusicIncome {
  static RATE = {
    per_minute_gdm: 0.5,
    artist_share: 0.7,
    listener_share: 0.3,
    min_seconds: 30
  };

  static addTrack(data) {
    const trackId = "TRK-" + crypto.randomBytes(6).toString("hex");
    tracks[trackId] = {
      trackId,
      title: data.title,
      artist: data.artist,
      artistWallet: data.artistWallet,
      duration: parseInt(data.duration) || 180,
      genre: data.genre || "general",
      url: data.url || null,
      plays: 0,
      total_gdm: 0,
      createdAt: new Date().toISOString()
    };
    save();
    return { ok: true, track: tracks[trackId] };
  }

  static startListen(userId, trackId) {
    const track = tracks[trackId];
    if (!track) return { ok: false, error: "TRACK_NOT_FOUND" };

    const listenId = "LSN-" + crypto.randomBytes(6).toString("hex");
    const listen = {
      listenId,
      userId,
      trackId,
      startedAt: Date.now(),
      seconds: 0,
      completed: false,
      reward_gdm: 0
    };
    listens.push(listen);
    save();
    return { ok: true, listenId, track };
  }

  static completeListen(listenId, seconds) {
    const listen = listens.find(l => l.listenId === listenId);
    if (!listen) return { ok: false, error: "NOT_FOUND" };
    if (listen.completed) return { ok: false, error: "ALREADY_COMPLETED" };

    const track = tracks[listen.trackId];
    if (!track) return { ok: false, error: "TRACK_NOT_FOUND" };

    if (seconds < this.RATE.min_seconds) {
      listen.seconds = seconds;
      listen.completed = true;
      listen.reward_gdm = 0;
      save();
      return { ok: false, error: "TOO_SHORT", min_seconds: this.RATE.min_seconds };
    }

    const minutes = seconds / 60;
    const totalReward = minutes * this.RATE.per_minute_gdm;
    const artistReward = totalReward * this.RATE.artist_share;
    const listenerReward = totalReward * this.RATE.listener_share;

    listen.seconds = seconds;
    listen.completed = true;
    listen.reward_gdm = listenerReward;
    listen.artist_gdm = artistReward;

    track.plays++;
    track.total_gdm += totalReward;

    earnings.total_gdm += totalReward;
    earnings.by_user[listen.userId] = (earnings.by_user[listen.userId] || 0) + listenerReward;
    earnings.by_track[listen.trackId] = (earnings.by_track[listen.trackId] || 0) + totalReward;

    save();

    // Neural Bus
    try {
      const { bus, EVENTS, CHANNELS } = require("./neural-bus.js");
      bus.publish(CHANNELS.TREASURY, {
        type: EVENTS.REVENUE_RECEIVED,
        data: {
          source: "music",
          amount_irt: 0,
          gdm: totalReward,
          userId: listen.userId,
          trackId: listen.trackId,
          description: "درآمد از موزیک"
        }
      }, "music-income");
    } catch(e) {}

    return {
      ok: true,
      listenerReward,
      artistReward,
      totalReward,
      track
    };
  }

  static getStats() {
    return {
      total_tracks: Object.keys(tracks).length,
      total_listens: listens.length,
      total_gdm_distributed: earnings.total_gdm,
      top_tracks: Object.values(tracks)
        .sort((a, b) => b.total_gdm - a.total_gdm)
        .slice(0, 10),
      rate: this.RATE
    };
  }
}

module.exports = { MusicIncome };
