import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import crypto from 'crypto';

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.randomFillSync(saltBytes);
  const salt = bytesToHex(saltBytes);

  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });

  console.log(salt + ':' + bytesToHex(key));
}

hashPassword(process.argv[2] || 'password');
