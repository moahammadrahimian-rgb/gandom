'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const QUEUE_FILE = path.join(__dirname, '..', 'autopublish-queue.json');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);

    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 30000
    }, res => {
      let raw = '';

      res.setEncoding('utf8');

      res.on('data', chunk => {
        raw += chunk;
      });

      res.on('end', () => {
        let data;

        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(
            data?.description ||
            data?.error?.message ||
            `HTTP_${res.statusCode}`
          );

          error.statusCode = res.statusCode;
          error.data = data;
          return reject(error);
        }

        resolve(data);
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('REQUEST_TIMEOUT'));
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}


class TelegramPublisher {
  constructor(options = {}) {
    this.botToken =
      options.botToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      '';

    this.chatId =
      options.chatId ||
      process.env.TELEGRAM_CHAT_ID ||
      '';
  }

  isConfigured() {
    return Boolean(this.botToken && this.chatId);
  }

  async publish(message) {
    if (!this.isConfigured()) {
      throw new Error('TELEGRAM_NOT_CONFIGURED');
    }

    if (!message || typeof message !== 'string') {
      throw new Error('INVALID_TELEGRAM_MESSAGE');
    }

    const url =
      `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    return requestJson(
      url,
      { method: 'POST' },
      {
        chat_id: this.chatId,
        text: message
      }
    );
  }
}


class InstagramPublisher {
  constructor(options = {}) {
    this.accessToken =
      options.accessToken ||
      process.env.INSTAGRAM_ACCESS_TOKEN ||
      '';

    this.userId =
      options.userId ||
      process.env.INSTAGRAM_USER_ID ||
      '';
  }

  isConfigured() {
    return Boolean(this.accessToken && this.userId);
  }

  async publish(imageUrl, caption) {
    if (!this.isConfigured()) {
      throw new Error('INSTAGRAM_NOT_CONFIGURED');
    }

    if (!imageUrl) {
      throw new Error('INSTAGRAM_IMAGE_URL_REQUIRED');
    }

    const createUrl =
      `https://graph.facebook.com/v23.0/${encodeURIComponent(this.userId)}/media`;

    const creation = await requestJson(
      createUrl,
      { method: 'POST' },
      {
        image_url: imageUrl,
        caption: caption || '',
        access_token: this.accessToken
      }
    );

    if (!creation.id) {
      throw new Error('INSTAGRAM_MEDIA_CREATION_FAILED');
    }

    const publishUrl =
      `https://graph.facebook.com/v23.0/${encodeURIComponent(this.userId)}/media_publish`;

    return requestJson(
      publishUrl,
      { method: 'POST' },
      {
        creation_id: creation.id,
        access_token: this.accessToken
      }
    );
  }
}


class AutoPublisher {
  constructor(options = {}) {
    this.telegram =
      options.telegram ||
      new TelegramPublisher(options);

    this.instagram =
      options.instagram ||
      new InstagramPublisher(options);

    this.p2p = options.p2p || null;

    this.queueFile =
      options.queueFile || QUEUE_FILE;

    this.timer = null;

    this.queue = readJson(this.queueFile, []);

    if (!Array.isArray(this.queue)) {
      this.queue = [];
    }

    this.saveQueue();
  }

  saveQueue() {
    writeJson(this.queueFile, this.queue);
  }

  setP2P(p2p) {
    this.p2p = p2p;
    return this;
  }

  schedule(platform, content, time = Date.now()) {
    if (!['telegram', 'instagram'].includes(platform)) {
      throw new Error('INVALID_PLATFORM');
    }

    const item = {
      id: crypto.randomUUID(),
      platform,
      content,
      time: new Date(time).getTime(),
      status: 'pending',
      createdAt: Date.now()
    };

    this.queue.push(item);
    this.saveQueue();

    return item;
  }

  getQueue() {
    return [...this.queue];
  }

  clearCompleted() {
    this.queue = this.queue.filter(
      item => item.status !== 'published'
    );

    this.saveQueue();

    return this.queue;
  }

  async publishItem(item) {
    if (item.platform === 'telegram') {
      return this.telegram.publish(
        item.content?.message || String(item.content || '')
      );
    }

    if (item.platform === 'instagram') {
      return this.instagram.publish(
        item.content?.imageUrl,
        item.content?.caption || ''
      );
    }

    throw new Error('INVALID_PLATFORM');
  }

  async processQueue() {
    const now = Date.now();

    for (const item of this.queue) {
      if (item.status !== 'pending') continue;
      if (item.time > now) continue;

      try {
        const result = await this.publishItem(item);

        item.status = 'published';
        item.publishedAt = Date.now();
        item.result = result;
      } catch (error) {
        item.status = 'failed';
        item.failedAt = Date.now();
        item.error = error.message;
      }
    }

    this.saveQueue();

    return this.getQueue();
  }

  start(intervalMs = 5000) {
    if (this.timer) return false;

    this.timer = setInterval(() => {
      this.processQueue().catch(() => {});
    }, intervalMs);

    return true;
  }

  stop() {
    if (!this.timer) return false;

    clearInterval(this.timer);
    this.timer = null;

    return true;
  }

  async publishAdWithAI(adData, ai) {
    if (!ai || typeof ai.enrichAd !== 'function') {
      throw new Error('AI_NOT_CONFIGURED');
    }

    const enriched = await ai.enrichAd(adData);

    const scheduled = [];

    const message = [
      enriched.title || 'آگهی گندم',
      enriched.aiDescription || '',
      enriched.city ? `شهر: ${enriched.city}` : ''
    ].filter(Boolean).join('\n');

    if (this.telegram.isConfigured()) {
      scheduled.push(
        this.schedule(
          'telegram',
          { message },
          Date.now()
        )
      );
    }

    if (
      this.instagram.isConfigured() &&
      enriched.imageUrl
    ) {
      scheduled.push(
        this.schedule(
          'instagram',
          {
            imageUrl: enriched.imageUrl,
            caption: message
          },
          Date.now()
        )
      );
    }

    if (this.p2p) {
      const packet = {
        type: 'auto_publish_ad',
        ad: enriched,
        timestamp: Date.now()
      };

      if (typeof this.p2p === 'function') {
        await this.p2p(packet);
      } else if (typeof this.p2p.broadcast === 'function') {
        await this.p2p.broadcast(packet);
      } else {
        throw new Error('P2P_BROADCAST_METHOD_NOT_FOUND');
      }
    }

    return {
      ok: true,
      published: true,
      scheduledCount: scheduled.length,
      scheduled,
      ad: enriched
    };
  }

  getStatus() {
    return {
      telegram: this.telegram.isConfigured(),
      instagram: this.instagram.isConfigured(),
      queueLength: this.queue.length,
      pending: this.queue.filter(
        item => item.status === 'pending'
      ).length,
      timerRunning: Boolean(this.timer),
      queueFile: this.queueFile
    };
  }
}


module.exports = {
  TelegramPublisher,
  InstagramPublisher,
  AutoPublisher
};


if (require.main === module) {
  const publisher = new AutoPublisher();

  const item = publisher.schedule(
    'telegram',
    {
      message: 'GANDOM AUTO PUBLISH TEST'
    },
    Date.now() + 60000
  );

  const status = publisher.getStatus();

  console.log('AUTO_PUBLISH_MODULE=LOADED');
  console.log('QUEUE_ITEM_ID=' + item.id);
  console.log('QUEUE_PLATFORM=' + item.platform);
  console.log('QUEUE_STATUS=' + item.status);
  console.log('QUEUE_LENGTH=' + status.queueLength);
  console.log('TELEGRAM_CONFIGURED=' + status.telegram);
  console.log('INSTAGRAM_CONFIGURED=' + status.instagram);
  console.log('AUTOPUBLISH_STRUCTURE_TEST=PASS');
}
