// https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
// https://github.com/ethereumjs/ethereumjs-wallet/blob/master/src/index.js
// why reimplement? (1) education, (2) ocap discipline (3) static typing

// @ts-check

import scrypt from 'scrypt.js'; // ISSUE: just use crypto.script?
import assert from './assert';
import { encrypt as AESencrypt, decrypt as AESdecrypt } from 'ethereum-cryptography/aes';

import { keccak256 } from 'js-sha3';

/**
 * @typedef { Buffer | string } Bytes<L>
 * @template L
 */
/**
 * @typedef { Bytes<20> } EthAddr
 * @typedef { string } UUID // ISSUE: opaque? only create from uuid API?
 * @typedef { Buffer} PrivateKey // ISSUE: opaque? only create from randomBytes?
 */
/**
 * @typedef {{
 *  version: 3,
 *  id: UUID,
 *  crypto: C & K & {
 *    ciphertext: Bytes<32>,
 *    mac: Bytes<32>,
 *  },
 * }} SecretStorageV3<C, K>
 * @template C
 * @template K
 */
/**
 * @typedef {{
 *    cipher: N,
 *    cipherparams: P,
 * }} Cipher<N, P>
 * @template N
 * @template P
 */
/**
 * @typedef {{
 *   kdf: N,
 *   kdfparams: P,
 * }} KDF<N, P>
 * @template N
 * @template P
 */
/**
 * @typedef { Cipher<'aes-128-ctr', { iv: Bytes<16> }> } AES128CTR
 * @typedef { KDF<'scrypt', {
 *   dklen: 32,
 *   salt: Bytes<32>,
 *   n: number,
 *   r: number,
 *   p: number,
 * }> } SCrypt
 */

/** @type { SecretStorageV3<AES128CTR, SCrypt> } */
export const testVectorScrypt = {
  crypto: {
    cipher: 'aes-128-ctr',
    cipherparams: { iv: '83dbcc02d8ccb40e466191a123791e0e' },
    ciphertext: 'd172bf743a674da9cdad04534d56926ef8358534d458fffccd4e6ad2fbde479c',
    kdf: 'scrypt',
    kdfparams: {
      dklen: 32,
      n: 262144,
      p: 8,
      r: 1,
      salt: 'ab0c7876052600dd703518d6fc3fe8984592145b591fc8fb5c6d43190334ba19',
    },
    mac: '2103ac29920d71da29f15d75b4a16dbe95cfd7ff8faea1056c33131d846e3097',
  },
  id: '3198bc9c-6672-5ab3-d995-4942343ae5b6',
  version: 3,
};

const testPk = decrypt(Buffer.from('testpassword'), testVectorScrypt);
assert(testPk.toString('hex') === '7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d');

/**
 *
 * @param {Buffer} password
 * @param {SecretStorageV3<AES128CTR, SCrypt>} item
 * @returns {PrivateKey}
 */
export function decrypt(password, item) {
  assert(item.crypto.kdf === 'scrypt');

  const { salt, n, r, p, dklen } = item.crypto.kdfparams;
  const derivedKey = scrypt(password, toBuf(salt), n, r, p, dklen);
  // console.log('Derived key:', derivedKey.toString('hex'));

  const MACBody = Buffer.concat([
    derivedKey.slice(16, 32),
    toBuf(item.crypto.ciphertext),
  ]);
  // console.log('MAC Body', MACBody.toString('hex'));
  const MAC = Buffer.from(keccak256(MACBody), 'hex');
  // console.log('MAC', MAC.toString('hex'));
  const diff = MAC.compare(toBuf(item.crypto.mac));
  // console.log('MAC diff?', diff);
  if (diff) {
    throw new Error('bad MAC (probably bad password)');
  }

  const cipherKey = derivedKey.slice(0, 128 / 8);
  assert(item.crypto.cipher === 'aes-128-ctr');
  const privateKey = AESdecrypt(
    toBuf(item.crypto.ciphertext), cipherKey, Buffer.from(toBuf(item.crypto.cipherparams.iv)),
  );
  return privateKey;
}

/**
 * @param {PrivateKey} privateKey
 * @param {Buffer} password
 * @param {(l: number) => Buffer} randomBytes
 * @param {() => UUID} uuidv4
 * @returns { SecretStorageV3<AES128CTR, SCrypt> }
 */
export function encrypt(privateKey, password, randomBytes, uuidv4) {
  /** @type { SCrypt } */
  const kdf = {
    kdf: 'scrypt',
    kdfparams: {
      salt: randomBytes(32),
      n: 1024,
      r: 8,
      p: 1,
      dklen: 32,
    },
  };
  // console.log('Derived key:', derivedKey.toString('hex'));
  /** @type { Buffer} */
  const derivedKey = scrypt(password, ...Object.values(kdf.kdfparams));

  const cipherKey = derivedKey.slice(0, 128 / 8);

  /** @type { AES128CTR } */
  const cipher = {
    cipher: 'aes-128-ctr',
    cipherparams: { iv: randomBytes(16) },
  };

  const ciphertext = AESencrypt(privateKey, cipherKey, toBuf(cipher.cipherparams.iv));

  const MACBody = Buffer.concat([
    derivedKey.slice(16, 32),
    ciphertext,
  ]);
  // console.log('MAC Body', MACBody.toString('hex'));
  const mac = keccak256(MACBody);
  // console.log('MAC', MAC.toString('hex'));

  /** @type { SecretStorageV3<AES128CTR, SCrypt> } */
  const item = {
    version: 3,
    id: uuidv4(),
    crypto: {
      mac,
      ciphertext,
      ...kdf,
      ...cipher,
    },
  };

  // umm... not pretty...
  const bytes = item.crypto;
  bytes.mac = toHex(item.crypto.mac);
  bytes.ciphertext = toHex(item.crypto.ciphertext);
  bytes.cipherparams.iv = toHex(bytes.cipherparams.iv);
  bytes.kdfparams.salt = toHex(item.crypto.kdfparams.salt);

  return item;
}

/**
 * @param { Bytes<L> } data
 * @returns { Buffer }
 * @template L
 */
function toBuf(data) {
  return typeof data === 'string' ? Buffer.from(data, 'hex') : data;
}

/**
 * @param { Bytes<L> } data
 * @returns { string }
 * @template L
 */
function toHex(data) {
  return typeof data === 'string' ? data : data.toString('hex');
}
