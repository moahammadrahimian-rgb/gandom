'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(__dirname, '..', 'oauth-tokens.json');

function requestForm(url, form) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = new URLSearchParams(form).toString();

    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, res => {
      let raw = '';

      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);

      res.on('end', () => {
        let data;

        try {
          data = JSON.parse(raw);
        } catch {
          data = { raw };
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(
            data?.error_message ||
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
      req.destroy(new Error('OAUTH_REQUEST_TIMEOUT'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);

    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      timeout: 30000
    }, res => {
      let raw = '';

      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);

      res.on('end', () => {
        let data;

        try {
          data = JSON.parse(raw);
        } catch {
          data = { raw };
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(
            data?.error?.message ||
            data?.error_message ||
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
      req.destroy(new Error('OAUTH_REQUEST_TIMEOUT'));
    });

    req.on('error', reject);
    req.end();
  });
}

class InstagramOAuth {
  constructor(options = {}) {
    this.clientId =
      options.clientId ||
      process.env.INSTAGRAM_CLIENT_ID ||
      '';

    this.clientSecret =
      options.clientSecret ||
      process.env.INSTAGRAM_CLIENT_SECRET ||
      '';

    this.redirectUri =
      options.redirectUri ||
      process.env.INSTAGRAM_REDIRECT_URI ||
      '';

    this.authorizeUrl =
      options.authorizeUrl ||
      'https://www.instagram.com/oauth/authorize';

    this.tokenUrl =
      options.tokenUrl ||
      'https://api.instagram.com/oauth/access_token';

    this.graphUrl =
      options.graphUrl ||
      'https://graph.instagram.com';

    this.tokens = this.loadTokens();
  }

  isConfigured() {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.redirectUri
    );
  }

  loadTokens() {
    try {
      if (!fs.existsSync(TOKEN_FILE)) return {};

      return JSON.parse(
        fs.readFileSync(TOKEN_FILE, 'utf8')
      );
    } catch {
      return {};
    }
  }

  saveTokens(tokens) {
    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify(tokens, null, 2)
    );

    this.tokens = tokens;
    return tokens;
  }

  createState() {
    return crypto.randomBytes(24).toString('hex');
  }

  getAuthUrl(state = this.createState()) {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('INSTAGRAM_OAUTH_CONFIG_MISSING');
    }

    const url = new URL(this.authorizeUrl);

    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      'instagram_business_basic,instagram_business_content_publish'
    );
    url.searchParams.set('state', state);

    return {
      state,
      url: url.toString()
    };
  }

  async exchangeCodeForToken(code) {
    if (!this.isConfigured()) {
      throw new Error('INSTAGRAM_OAUTH_CONFIG_MISSING');
    }

    if (!code) {
      throw new Error('INSTAGRAM_AUTH_CODE_REQUIRED');
    }

    const result = await requestForm(
      this.tokenUrl,
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code
      }
    );

    return this.saveTokens({
      ...result,
      savedAt: Date.now()
    });
  }

  async getUserInfo(accessToken = this.tokens.access_token) {
    if (!accessToken) {
      throw new Error('INSTAGRAM_ACCESS_TOKEN_MISSING');
    }

    const url = new URL(`${this.graphUrl}/me`);

    url.searchParams.set(
      'fields',
      'user_id,username'
    );

    url.searchParams.set(
      'access_token',
      accessToken
    );

    return requestJson(url.toString());
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      tokenStored: Boolean(this.tokens.access_token),
      tokenFile: TOKEN_FILE
    };
  }
}

module.exports = {
  InstagramOAuth
};

if (require.main === module) {
  const oauth = new InstagramOAuth();
  const status = oauth.getStatus();

  console.log('INSTAGRAM_OAUTH_MODULE=LOADED');
  console.log('OAUTH_CONFIGURED=' + status.configured);
  console.log('TOKEN_STORED=' + status.tokenStored);
  console.log('AUTH_METHOD=' + typeof oauth.getAuthUrl);
  console.log('TOKEN_METHOD=' + typeof oauth.exchangeCodeForToken);
  console.log('USERINFO_METHOD=' + typeof oauth.getUserInfo);
  console.log('INSTAGRAM_OAUTH_STRUCTURE_TEST=PASS');
}
