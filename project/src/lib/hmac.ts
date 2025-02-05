// Pure JavaScript HMAC-SHA256 implementation
export function hmacSha256(key: string, message: string): string {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const messageBytes = encoder.encode(message);

  // Constants for SHA-256
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  function rotateRight(n: number, x: number): number {
    return (x >>> n) | (x << (32 - n));
  }

  function sha256(message: Uint8Array): Uint8Array {
    const H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);

    const blocks = Math.ceil((message.length + 9) / 64);
    const paddedLength = blocks * 64;
    const paddedMessage = new Uint8Array(paddedLength);
    paddedMessage.set(message);
    paddedMessage[message.length] = 0x80;

    const dv = new DataView(paddedMessage.buffer);
    dv.setBigUint64(paddedLength - 8, BigInt(message.length * 8), false);

    for (let i = 0; i < blocks; i++) {
      const block = new Uint32Array(16);
      for (let j = 0; j < 16; j++) {
        block[j] = dv.getUint32(i * 64 + j * 4, false);
      }

      const W = new Uint32Array(64);
      for (let t = 0; t < 16; t++) {
        W[t] = block[t];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotateRight(7, W[t - 15]) ^ rotateRight(18, W[t - 15]) ^ (W[t - 15] >>> 3);
        const s1 = rotateRight(17, W[t - 2]) ^ rotateRight(19, W[t - 2]) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = H;

      for (let t = 0; t < 64; t++) {
        const S1 = rotateRight(6, e) ^ rotateRight(11, e) ^ rotateRight(25, e);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotateRight(2, a) ^ rotateRight(13, a) ^ rotateRight(22, a);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    const result = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      result[i * 4] = H[i] >>> 24;
      result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
      result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
      result[i * 4 + 3] = H[i] & 0xff;
    }
    return result;
  }

  // HMAC implementation
  const blockSize = 64;
  const outputSize = 32;

  // Prepare key
  let keyBlock = new Uint8Array(blockSize);
  if (keyBytes.length > blockSize) {
    keyBlock = sha256(keyBytes).slice(0, blockSize);
  } else {
    keyBlock.set(keyBytes);
  }

  // Create padded keys
  const outerPadding = new Uint8Array(blockSize);
  const innerPadding = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    outerPadding[i] = keyBlock[i] ^ 0x5c;
    innerPadding[i] = keyBlock[i] ^ 0x36;
  }

  // Inner hash
  const innerData = new Uint8Array(blockSize + messageBytes.length);
  innerData.set(innerPadding);
  innerData.set(messageBytes, blockSize);
  const innerHash = sha256(innerData);

  // Outer hash
  const outerData = new Uint8Array(blockSize + outputSize);
  outerData.set(outerPadding);
  outerData.set(innerHash, blockSize);
  const outerHash = sha256(outerData);

  // Convert to hex
  return Array.from(outerHash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}