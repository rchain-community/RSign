// console.debug('ethProvider content script...');
// @ts-check
import { runInPage, RSignMessageType } from './inPage';
import { sigTool, localStorage } from './sigTool.js';
import randomBytes from 'randombytes'; // WARNING! powerful. TODO: separate from pure code

const { freeze } = Object;

/**
 * Injects a script tag into the current document
 *
 * ack: https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/contentscript.js#L40
 *
 * @param {string} content - Code to be executed in the current document
 * @param {{ document: DocumentT }} io
 * @typedef { typeof document } DocumentT
 */
 function injectScript(content, { document }) {
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');
    scriptTag.setAttribute('async', 'false');
    scriptTag.textContent = content;
    container.insertBefore(scriptTag, container.children[0]);
    container.removeChild(scriptTag);
  } catch (error) {
    console.error('RSign provider: injection failed.', error);
  }
}

/**
 * @param {ReturnType<typeof sigTool>} tool
 */
function makeProvider(tool) {
  return freeze({
    eth_requestAccounts: async () => {
      const key = await tool.getKey();
      if (!key) {
        throw Error('no key available');
      }
      console.log('got key:', { key });
      return [key.ethAddr];
    }
  })
}

/**
 * @param {{
 *   addEventListener: typeof window.addEventListener,
 *   inject: (content: string) => void,
 *   onMessage: typeof chrome.runtime.onMessage,
 *   postMessage: typeof window.postMessage,
 *   randomBytes: typeof randomBytes,
 *   ua: UserAgent,
 * }} io
 *
 * @typedef { import('./sigTool').UserAgent } UserAgent
 */
function start({ addEventListener, inject, randomBytes, onMessage, ua }) {
  inject(`(${runInPage})();`);

  const tool = sigTool(localStorage(ua), randomBytes);

  const provider = makeProvider(tool);

  addEventListener('message', async event => {
    const { method, params } = event.data;
    if (!(method in provider)) {
      return false;
    }
    console.log('@@@handling content script message...', event.data);
    // TODO: handle exceptions
    const result = await provider[method](params);
    console.log('TODO: send result:', result);
    postMessage(RSignMessageType, result);
  });

  onMessage.addListener((x, _sender, _sendResponse) => {
    console.log('TODO: handle chrome runtime message??', x);
  });
}

///////
// NOTE: We use ambient access to document, chrome below.
// TODO: Move code above to pure module.
start({
  addEventListener: window.addEventListener.bind(window),
  inject: (content) => injectScript(content, { document }),
  onMessage: chrome.runtime.onMessage,
  postMessage: window.postMessage.bind(window),
  randomBytes,
  ua: { chrome: window.chrome },
});
