/** sigTool -- signing key generation, storage, and usage
 */
// @ts-check

/* global unescape, encodeURIComponent, HTMLInputElement, HTMLTextAreaElement */

import uuidv4 from 'uuid-random'; // WARNING: powerful. TODO: thread explicitly
import { privateToPublic, Address } from 'ethereumjs-util';
import * as SS from './secretStorage';

const { freeze, keys } = Object;

/** @param { unknown } x */
function asStr(x) {
  if (typeof x !== 'string') { return ''; }
  return x;
}

/**
 * @typedef {{
 *   generate(_: { label: string, password: string }): Promise<SigningKey>, // Generate and save key.
 *   getKey(): Promise<SigningKey | null>, // Get stored key.
 *   signMessage(message: Uint8Array, signingKey: SigningKey, password: string): string // Decrypt private key and use it to sign message.
 * }} SigTool
 *
 * @typedef { SecretStorageV3<AES128CTR, SCrypt> & {
 *   label: string,
 *   pubKey: string,
 *   ethAddr: string, // TODO: REVAddress?
 * }} SigningKey
 * @typedef { import('./secretStorage').AES128CTR } AES128CTR
 * @typedef { import('./secretStorage').SCrypt } SCrypt
 */
/**
 * @typedef { import('./secretStorage').SecretStorageV3<C,K> } SecretStorageV3<C,K>
 * @template C
 * @template K
 */

/**
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea
 *
 * @typedef {{
 *   get(key: string): Promise<Record<string, unknown>>,
 *   set(items: Record<string, unknown>): Promise<void>
 * }} StorageArea
 */


/**
 * Toward a portable chrome/firefox API (WIP).
 * @typedef {{
 *   chrome: typeof chrome,
 *   browser?: {
 *     storage: {
 *       local: StorageArea
 *     }
 *   }
 * }} UserAgent
 */

/**
 *
 * @param { DocumentT } document
 * @param { UserAgent } ua
 * @param { typeof import('crypto').randomBytes } randomBytes
 *
 * @typedef { typeof document } DocumentT
 */
export function options(document, ua, randomBytes) {
  function the/*:: <T>*/(x /*: ?T*/) /*: T*/ { if (!x) { throw new Error(x); } return x; }
  const byId = id => the(document.getElementById(id));

  function lose(doing, exc /*: Error */) {
    byId('status').textContent = `failed ${doing}: ${exc.message}`;
    console.log(exc);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tool = sigTool(localStorage(ua), randomBytes);
    tool.getKey()
      .then(showPubKey)
      .catch(oops => lose('get key', oops));

    byId('save').addEventListener('click', () => {
      byId('status').textContent = '';

      tool.generate({
        label: input(byId('label')).value,
        password: input(byId('password')).value,
      })
        .then(showPubKey)
        .catch(oops => lose('generate key', oops));
    });
  });


  /**
   * @param {SigningKey | null} maybeKey
   */
  function showPubKey(maybeKey) {
    if (!maybeKey) { return; }
    const { label, pubKey } = maybeKey;
    /* Assigning to params is the norm for DOM stuff. */
    /* eslint-disable no-param-reassign */
    input(byId('label')).value = label;
    input(byId('pubKey')).value = pubKey;
  }
}


/**
 * Runtime check that this element is an input.
 *
 * @param { HTMLElement } elt
 * @returns { HTMLInputElement | HTMLTextAreaElement }
 */
export function input(elt) {
  if (!(elt instanceof HTMLInputElement || elt instanceof HTMLTextAreaElement)) {
    throw new TypeError(`not an input: ${elt.toString()}`);
  }
  return elt;
}


/**
 * Normalize local storage API
 *
 * Produce promise-style API despite [chrome compatibility issues][1].
 *
 * @param { UserAgent } ua
 * @returns { StorageArea }
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
 */
export function localStorage({ browser, chrome }) {
  return browser ? browser.storage.local : freeze({
    set: items => asPromise(chrome, callback => chrome.storage.local.set(items, callback)),
    get: key => asPromise(chrome, callback => chrome.storage.local.get(key, callback)),
  });
}

/**
 * @param { StorageArea } local
 * @param { randomBytes } randomBytes
 * @returns { SigTool }
 */
// @ts-ignore
export function sigTool(local, randomBytes) {
  /**
   * @returns { Promise<SigningKey | null> }
   */
  function getKey() {
    return local.get('signingKey').then(({ signingKey }) => chkKey(signingKey));
  }

  /**
   * @param { unknown } it
   * @returns { SigningKey | null }
   */
  function chkKey(it) {
    console.log('chkKey', { it });
    /**
     * @param {Set} as
     * @param {Set} bs
     * @returns
     */
    function eqSet(as, bs) {
      if (as.size !== bs.size) return false;
      for (const a of as) if (!bs.has(a)) return false;
      return true;
    }
    /**
     * @param {unknown} a
     * @param {unknown} b
     */
    function sameShape(a, b) {
      if (typeof a !== typeof b) { return false; }
      if (typeof a !== 'object') { return true; }
      // tsc isn't smart enough to know they're the same...
      if (typeof b !== 'object') { return false; }
      if (!a) { return null; }
      if (!b) { return null; }
      const props = new Set(...keys(a));
      if (!eqSet(props, new Set(...keys(b)))) return false;
      for (const p of props) {
        if (!sameShape(a[p], b[p])) return false;
      }
      return true;
    }
    const extra = { label: 's', 'pubKey': 's', ethAddr: '0x...' };
    if (!sameShape(it, { ...SS.testVectorScrypt, ...extra })) return null;
    // @ts-ignore testVectorScrypt was statically checked
    return it;
  }

  async function generate({ label, password }) {
    console.log('generate...');
    const privateKey = randomBytes(32);
    console.log('encrypt...');
    const item = SS.encrypt(privateKey, password, randomBytes, uuidv4);
    console.log('...encrypted');
    const pubKey = privateToPublic(privateKey).toString('hex');
    const ethAddr = Address.fromPrivateKey(privateKey).toString();
    const signingKey = { ...item, label, pubKey, ethAddr };
    console.log('generated:', { signingKey });
    await local.set({ signingKey });
    return signingKey;
  }

  /**
   * Hash text password to get bytes for secretbox key.
   */
  function passKey(password /*: string*/) /*: Uint8Array */{
    // @ts-ignore
    return nacl.hash(utf8(password)).slice(0, nacl.secretbox.keyLength);
  }

  function encryptWithNonce(message /*: Uint8Array */, key) {
    // @ts-ignore
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    // @ts-ignore
    const cipherText = nacl.secretbox(message, nonce, key);
    return { cipherText, nonce };
  }

  /**
   * @param {Uint8Array} message
   * @param {SigningKey} signingKey
   * @param {string} password
   * @returns
   */
  function signMessage(message, signingKey, password) {
    throw Error('TODO: port from ed25519 / nacl to secp256k1')
    const nonce = h2b(signingKey.secretKey.nonce);
    const box = h2b(signingKey.secretKey.cipherText);
    // @ts-ignore
    const secretKey = nacl.secretbox.open(box, nonce, passKey(password));

    if (secretKey === null) {
      throw new Error('bad password');
    }

    // @ts-ignore
    return b2h(nacl.sign.detached(message, secretKey));
  }

  return freeze({ getKey, generate, signMessage });
}


/**
 * Adapt callback-style API using Promises.
 *
 * Instead of obj.method(...arg, callback),
 * use send(cb => obj.method(...arg, cb)) and get a promise.
 *
 * ref https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
 * https://github.com/mdn/webextensions-examples/issues/194
 *
 * @param calling: a function of the form (cb) => o.m(..., cb)
 * @return A promise for the result passed to cb
 */
function asPromise/*:: <T>*/(
  chrome /*: typeof chrome*/,
  calling /*: (cb: (T) => void) => mixed */,
) /*: Promise<T> */{
  function executor(resolve, reject) {
    function callback(result /*: T*/) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result);
    }

    calling(callback);
  }

  return new Promise(executor);
}


function utf8(s /*: string*/) /*: Uint8Array*/ {
  const byteChars = unescape(encodeURIComponent(s));
  return Uint8Array.from([...byteChars].map(ch => ch.charCodeAt(0)));
}


// ack: https://gist.github.com/tauzen/3d18825ae41ff3fc8981
function b2h(uint8arr /*: Uint8Array*/) /*: string */{
  if (!uint8arr) {
    return '';
  }

  let hexStr = '';
  for (let i = 0; i < uint8arr.length; i += 1) {
    let hex = (uint8arr[i] & 0xff).toString(16); // eslint-disable-line no-bitwise
    hex = (hex.length === 1) ? `0${hex}` : hex;
    hexStr += hex;
  }

  return hexStr;
}


function h2b(str) {
  if (!str) {
    return new Uint8Array([]);
  }

  const a = [];
  for (let i = 0, len = str.length; i < len; i += 2) {
    a.push(parseInt(str.substr(i, 2), 16));
  }

  return new Uint8Array(a);
}
