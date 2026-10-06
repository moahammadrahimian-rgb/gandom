const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

class IPFSStore {
  constructor(
    dir = path.join(__dirname, 'store'),
    chunkSize = 256 * 1024
  ) {
    this.dir = dir;
    this.chunkSize = chunkSize;
    this.chunksDir = path.join(dir, 'chunks');
    this.dagsDir = path.join(dir, 'dag');
    fs.mkdirSync(this.chunksDir, { recursive: true });
    fs.mkdirSync(this.dagsDir, { recursive: true });
  }

  putBuffer(buffer) {
    const chunks = [];
    for (let i = 0; i < buffer.length; i += this.chunkSize) {
      const chunk = buffer.subarray(i, i + this.chunkSize);
      const hash = sha256(chunk);
      const chunkFile = path.join(this.chunksDir, hash);
      if (!fs.existsSync(chunkFile)) {
        fs.writeFileSync(chunkFile, chunk);
      }
      chunks.push(hash);
    }
    const manifest = { version: 1, type: 'file', chunkSize: this.chunkSize, chunks };
    const cid = sha256(Buffer.from(JSON.stringify({
      version: manifest.version,
      chunkSize: manifest.chunkSize,
      chunks: manifest.chunks
    })));
    fs.writeFileSync(path.join(this.dagsDir, cid + '.json'), JSON.stringify(manifest, null, 2));
    return { cid, size: buffer.length, chunks: chunks.length };
  }

  putFile(filePath) { return this.putBuffer(fs.readFileSync(filePath)); }

  getBuffer(cid) {
    const dagFile = path.join(this.dagsDir, cid + '.json');
    if (!fs.existsSync(dagFile)) throw new Error('CID_NOT_FOUND');
    const dag = JSON.parse(fs.readFileSync(dagFile, 'utf8'));
    const buffers = dag.chunks.map((hash) => {
      const file = path.join(this.chunksDir, hash);
      if (!fs.existsSync(file)) throw new Error('CHUNK_NOT_FOUND:' + hash);
      const data = fs.readFileSync(file);
      if (sha256(data) !== hash) throw new Error('CHUNK_INTEGRITY_FAILED:' + hash);
      return data;
    });
    return Buffer.concat(buffers);
  }

  getFile(cid, outputPath) { fs.writeFileSync(outputPath, this.getBuffer(cid)); return outputPath; }

  has(cid) { return fs.existsSync(path.join(this.dagsDir, cid + '.json')); }

  exportManifest(cid) { return JSON.parse(fs.readFileSync(path.join(this.dagsDir, cid + '.json'), 'utf8')); }

  importChunk(hash, data) {
    if (sha256(data) !== hash) throw new Error('CHUNK_HASH_MISMATCH');
    fs.writeFileSync(path.join(this.chunksDir, hash), data);
  }

  importManifest(cid, manifest) {
    const calculatedCID = sha256(Buffer.from(JSON.stringify({
      version: manifest.version,
      chunkSize: manifest.chunkSize,
      chunks: manifest.chunks
    })));
    if (calculatedCID !== cid) throw new Error('CID_MISMATCH');
    fs.writeFileSync(path.join(this.dagsDir, cid + '.json'), JSON.stringify(manifest, null, 2));
  }

  async distribute(cid, peers, send) {
    const manifest = this.exportManifest(cid);
    let sent = 0;
    for (const peer of peers) {
      await send(peer, { type: 'ipfs_manifest', cid, manifest });
      for (const hash of manifest.chunks) {
        const data = fs.readFileSync(path.join(this.chunksDir, hash));
        await send(peer, { type: 'ipfs_chunk', cid, hash, data: data.toString('base64') });
      }
      sent++;
    }
    return { cid, peers: sent, chunks: manifest.chunks.length };
  }
}

module.exports = { IPFSStore, sha256 };
