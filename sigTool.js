/** sigTool -- signing key generation, storage, and usage
@flow strict
 */

/* global unescape, encodeURIComponent, HTMLInputElement, HTMLTextAreaElement */

import { asStr } from './messageBus.js';

const def = Object.freeze;

/*::

// SigningKey is the format we use to save the key pair
// with the secret key encrypted.
export type SigningKey = {
  label: string,
  secretKey: {
    // ISSUE: opaque type for hex?
    nonce: string,
    cipherText: string,
  },
  pubKey: string
}

interface SigTool {
  // Generate and save key.
  generate({ label: string, password: string }): Promise<SigningKey>,
  // Get stored key.
  getKey(): Promise<SigningKey | null>,
  // Decrypt private key and use it to sign message.
  signMessage(message: Uint8Array, signingKey: SigningKey, password: string): string
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea
interface StorageArea {
  get(key: string): Promise<{ [string]: mixed }>,
  set(items: { [string]: mixed }): Promise<void>
}

// Toward a portable chrome/firefox API (WIP).
export type UserAgent = {
  chrome: typeof chrome,
  browser?: {
    storage: {
      local: StorageArea
    }
  }
}

*/

export function options(document /*: Document*/, ua /*: UserAgent*/, nacl /*: typeof nacl*/) {
  function the/*:: <T>*/(x /*: ?T*/) /*: T*/ { if (!x) { throw new Error(x); } return x; }
  const byId = id => the(document.getElementById(id));

  function lose(doing, exc /*: Error */) {
    byId('status').textContent = `failed ${doing}: ${exc.message}`;
    console.log(exc);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tool = sigTool(localStorage(ua), nacl);
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


  function showPubKey(maybeKey /*: SigningKey | null*/) {
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
 */
export function input(elt /*: HTMLElement*/) /*: HTMLInputElement | HTMLTextAreaElement */ {
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
 * [1]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
 */
export function localStorage({ browser, chrome } /*: UserAgent*/) /*: StorageArea */{
  return browser ? browser.storage.local : def({
    set: items => asPromise(chrome, callback => chrome.storage.local.set(items, callback)),
    get: key => asPromise(chrome, callback => chrome.storage.local.get(key, callback)),
  });
}


export function sigTool(local /*: StorageArea */, nacl /*: typeof nacl*/) /*: SigTool */ {
  function getKey() /*: Promise<SigningKey | null> */{
    return local.get('signingKey').then(({ signingKey }) => chkKey(signingKey));
  }

  function chkKey(it /*: mixed*/) /*: SigningKey | null */ {
    if (it === null) { return null; }
    if (typeof it !== 'object') { return null; }
    const { secretKey } = it;
    if (!secretKey || typeof secretKey !== 'object') { return null; }
    const { nonce } = secretKey;
    if (typeof nonce !== 'string') { return null; }
    const { cipherText } = secretKey;
    if (typeof cipherText !== 'string') { return null; }
    return {
      label: asStr(it.label),
      secretKey: { nonce, cipherText },
      pubKey: asStr(it.pubKey),
    };
  }

  function generate({ label, password }) {
    const signingKey = encryptedKey(nacl.sign.keyPair(), { label, password });
    return local.set({ signingKey }).then(() => signingKey);
  }

  function encryptedKey(keyPair, { label, password }) {
    const sk = encryptWithNonce(keyPair.secretKey, passKey(password));

    return {
      label,
      secretKey: {
        nonce: b2h(sk.nonce),
        cipherText: b2h(sk.cipherText),
      },
      pubKey: b2h(keyPair.publicKey),
    };
  }

  /**
   * Hash text password to get bytes for secretbox key.
   */
  function passKey(password /*: string*/) /*: Uint8Array */{
    return nacl.hash(utf8(password)).slice(0, nacl.secretbox.keyLength);
  }

  function encryptWithNonce(message /*: Uint8Array */, key) {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const cipherText = nacl.secretbox(message, nonce, key);
    return { cipherText, nonce };
  }

  function signMessage(
    message /*: Uint8Array */,
    signingKey /*: SigningKey*/,
    password /*: string*/,
  ) {
    const nonce = h2b(signingKey.secretKey.nonce);
    const box = h2b(signingKey.secretKey.cipherText);
    const secretKey = nacl.secretbox.open(box, nonce, passKey(password));

    if (secretKey === null) {
      throw new Error('bad password');
    }

    return b2h(nacl.sign.detached(message, secretKey));
  }

  return def({ getKey, generate, signMessage });
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
