// ═══════════════════════════════════════════════════════
// 🔗 GANDOM BLOCKCHAIN P2P HANDLER
// ═══════════════════════════════════════════════════════

function handleBlockchainMessage(message, ws, peerId, gandomChain, peers, send) {
  const type = message.type;

  // ─── درخواست طول زنجیره ───
  if (type === 'GET_CHAIN_LENGTH') {
    console.log(`🔗 ${peerId} درخواست طول زنجیره`);
    send(ws, 'CHAIN_LENGTH', {
      length: gandomChain.chain.length,
      latestHash: gandomChain.getLatest().hash,
      latestIndex: gandomChain.getLatest().index
    });
    return true;
  }

  // ─── درخواست کل زنجیره ───
  if (type === 'GET_CHAIN') {
    console.log(`🔗 ${peerId} درخواست کل زنجیره (${gandomChain.chain.length} بلوک)`);
    send(ws, 'CHAIN_DATA', {
      length: gandomChain.chain.length,
      blocks: gandomChain.chain.map(b => b.toJSON())
    });
    return true;
  }

  // ─── دریافت بلوک جدید از نود دیگه ───
  if (type === 'NEW_BLOCK_FROM_PEER') {
    console.log(`📥 بلوک جدید از ${peerId} دریافت شد`);
    try {
      const Block = require('./blockchain-100.js').Block;
      const block = Block.fromJSON(message.block);
      const latest = gandomChain.getLatest();

      if (block.index <= latest.index) {
        console.log(`   ⏭️  بلوک ${block.index} قبلاً داریم`);
        return true;
      }

      if (block.index !== latest.index + 1) {
        console.log(`   ⚠️  gap detected - نیاز به sync`);
        return true;
      }

      if (!gandomChain.isValidBlock(block, latest)) {
        console.log(`   ❌ بلوک نامعتبر`);
        return true;
      }

      gandomChain.chain.push(block);
      gandomChain.save();
      console.log(`   ✅ بلوک ${block.index} اضافه شد (ارتفاع: ${gandomChain.chain.length})`);
      return true;
    } catch(e) {
      console.log(`   ❌ خطا: ${e.message}`);
      return true;
    }
  }

  // ─── نود دیگه‌ای زنجیره‌اش رو طولانی‌تر دیده ───
  if (type === 'REQUEST_FULL_SYNC') {
    console.log(`🔄 ${peerId} درخواست sync کامل`);
    send(ws, 'CHAIN_DATA', {
      length: gandomChain.chain.length,
      blocks: gandomChain.chain.map(b => b.toJSON())
    });
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════
// 📡 پخش بلوک جدید به همه نودها
// ═══════════════════════════════════════════════════════
function broadcastNewBlock(block, peers) {
  let count = 0;
  for (const [id, peer] of peers) {
    if (peer.ws && peer.ws.readyState === 1) {
      peer.ws.send(JSON.stringify({
        type: 'NEW_BLOCK_FROM_PEER',
        block: block.toJSON(),
        from: 'NODE-A',
        timestamp: Date.now()
      }));
      count++;
    }
  }
  console.log(`📡 بلوک #${block.index} به ${count} نود پخش شد`);
  return count;
}

module.exports = { handleBlockchainMessage, broadcastNewBlock };
