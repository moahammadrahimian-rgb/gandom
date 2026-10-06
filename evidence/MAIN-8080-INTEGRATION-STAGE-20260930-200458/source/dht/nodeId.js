const crypto = require('crypto');

function generateNodeId() {
    return crypto.randomBytes(20).toString('hex');
}

module.exports = { generateNodeId };
