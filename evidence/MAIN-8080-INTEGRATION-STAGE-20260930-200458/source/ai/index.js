const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/free';
const CACHE_FILE = path.join(__dirname, 'ai-cache.json');

class AI {
  constructor(options = {}) {
    this.apiKey = options.apiKey || this.loadApiKey();
    this.baseUrl = options.baseUrl ||
      process.env.OPENROUTER_BASE_URL ||
      DEFAULT_BASE_URL;
    this.model = options.model ||
      process.env.OPENROUTER_MODEL ||
      this.loadEnvValue('OPENROUTER_MODEL') ||
      DEFAULT_MODEL;
    this.timeout = Number.isInteger(options.timeout)
      ? options.timeout
      : 30000;
    this.p2p = options.p2p || null;
  }

  loadApiKey() {
    if (process.env.OPENROUTER_API_KEY) {
      return process.env.OPENROUTER_API_KEY;
    }

    const envFile = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envFile)) {
      return '';
    }

    const text = fs.readFileSync(envFile, 'utf8');

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(
        /^\s*OPENROUTER_API_KEY\s*=\s*(.*?)\s*$/
      );

      if (match) {
        return match[1].replace(/^["']|["']$/g, '');
      }
    }

    return '';
  }

  loadEnvValue(name) {
    const envFile = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envFile)) {
      return '';
    }

    const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const prefix = name + '=';

      if (trimmed.startsWith(prefix)) {
        return trimmed
          .slice(prefix.length)
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }

    return '';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  isConfigured() {
    return this.isAvailable();
  }

  getCached(key) {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }

    try {
      const cache = JSON.parse(
        fs.readFileSync(CACHE_FILE, 'utf8')
      );

      return cache[key] || null;
    } catch {
      return null;
    }
  }

  cacheResponse(key, value) {
    let cache = {};

    if (fs.existsSync(CACHE_FILE)) {
      try {
        cache = JSON.parse(
          fs.readFileSync(CACHE_FILE, 'utf8')
        );
      } catch {
        cache = {};
      }
    }

    cache[key] = {
      response: value,
      timestamp: Date.now()
    };

    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(cache, null, 2)
    );

    return value;
  }

  createCacheKey(prompt, options = {}) {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          prompt,
          model: options.model || this.model
        })
      )
      .digest('hex');
  }

  async generateText(prompt, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OPENROUTER_API_KEY_MISSING');
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('INVALID_PROMPT');
    }

    const cacheKey = this.createCacheKey(prompt, options);
    const cached = this.getCached(cacheKey);

    if (cached && cached.response) {
      return cached.response;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.timeout
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: options.model || this.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature:
              options.temperature ?? 0.7,
            max_tokens:
              options.maxTokens ?? 500
          }),
          signal: controller.signal
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          `OPENROUTER_HTTP_${response.status}`
        );
      }

      const content =
        data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI_EMPTY_RESPONSE');
      }

      this.cacheResponse(cacheKey, content);

      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  async chat(messages, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OPENROUTER_API_KEY_MISSING');
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.timeout
    );

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: options.model || this.model,
            messages,
            temperature:
              options.temperature ?? 0.7,
            max_tokens:
              options.maxTokens ?? 500
          }),
          signal: controller.signal
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          `OPENROUTER_HTTP_${response.status}`
        );
      }

      return {
        content:
          data?.choices?.[0]?.message?.content || '',
        model: data?.model || this.model,
        raw: data
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async ask(prompt, options = {}) {
    return this.generateText(prompt, options);
  }

  async generateAdDescription(productData) {
    return this.generateText(
      `برای محصول زیر یک توضیحات تبلیغاتی جذاب و واقعی بنویس.
اطلاعات محصول:
${JSON.stringify(productData, null, 2)}

متن فارسی، کوتاه، قابل انتشار و بدون ادعای ساختگی تولید کن.`,
      {
        temperature: 0.7,
        maxTokens: 1000
      }
    );
  }

  async generateViralContent(topic) {
    return this.generateText(
      `برای موضوع زیر یک محتوای فارسی جذاب برای انتشار در شبکه‌های اجتماعی تولید کن:

${topic}

محتوا باید کوتاه، طبیعی، قابل فهم و بدون اطلاعات ساختگی باشد.`,
      {
        temperature: 0.8,
        maxTokens: 500
      }
    );
  }

  async enrichAd(adData) {
    const description =
      await this.generateAdDescription(adData);

    return {
      ...adData,
      aiDescription: description
    };
  }

  setP2P(p2p) {
    this.p2p = p2p;
    return this;
  }

  async publishAdWithAI(adData) {
    const enriched = await this.enrichAd(adData);

    if (!this.p2p) {
      throw new Error('P2P_BROADCAST_NOT_CONFIGURED');
    }

    if (typeof this.p2p === 'function') {
      await this.p2p(enriched);
    } else if (
      typeof this.p2p.broadcast === 'function'
    ) {
      await this.p2p.broadcast(enriched);
    } else if (
      typeof this.p2p.broadcastMessage === 'function'
    ) {
      await this.p2p.broadcastMessage(enriched);
    } else if (
      typeof this.p2p.broadcastAd === 'function'
    ) {
      await this.p2p.broadcastAd(enriched);
    } else {
      throw new Error('P2P_BROADCAST_METHOD_NOT_FOUND');
    }

    return {
      ok: true,
      published: true,
      ad: enriched
    };
  }

  async health() {
    return {
      ok: this.isAvailable(),
      configured: this.isAvailable(),
      model: this.model
    };
  }

  status() {
    return {
      available: this.isAvailable(),
      model: this.model,
      cacheFile: CACHE_FILE
    };
  }
}

const GandomAI = AI;

module.exports = {
  AI,
  GandomAI
};
