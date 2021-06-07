// @ts-check

export const RSignMessageType = 'rsign/osh9EiLi';

/**
 * NOTE: runInPage is injected into the page in string form,
 *       so references outside its scope don't work.
 *
 * see also
 * https://stackoverflow.com/questions/12395722/can-the-window-object-be-modified-from-a-chrome-extension
 * https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/contentscript.js#L40
 */
export const runInPage = () => {
    // console.debug('runInPage...');

    const RSignMessageType = 'rsign/osh9EiLi';

    /**
     * Install window.ethereum
     *
     * NOTE: should be run before dApp scripts.
     *       Use ["run_at": "document_start"][1]
     *       in chrome manifest.
     *
     * [1]: https://github.com/MetaMask/metamask-extension/blob/9932c40651646ce1589ce428ff25190c3958a6c3/app/manifest/_base.json#L40
     *
     * @param { Record<string, unknown> } target
     * @param {{
     *  addEventListener: typeof window.addEventListener,
     *  dispatchEvent: typeof window.dispatchEvent,
     *  postMessage: typeof window.postMessage,
     *  removeEventListener: typeof window.removeEventListener,
     * }} io
     */
    function install(target, { addEventListener, dispatchEvent, postMessage }) {
      // console.debug('install...');
      const { freeze } = Object;

      let q = 1;

      target.ethereum = freeze({
        request: ({ method, params }) => {
          console.log('RSign provider request:', { method, q });
          const done = new Promise((resolve, reject) => {
            /** @typedef {{ ok: true, result: unknown } | { ok: false, error: Error }} Outcome */
            /** @param { MessageEvent<{ a: number } & Outcome> } event */
            const handler = async (event) => {
              // console.log('handler: event for me?', { eq: event.source === window });
              if (event.source !== window) { // WARNING: ambient window. TODO: thread.
                console.warn('window.ethereum request: unknown event.source', { q });
                return false;
              }
              const data = event.data;
              const { a } = event.data;
              if (a !== q + 1) {
                console.warn('window.ethereum request: bad sequence #:', { expected: q + 1, actual: a })
                return false;
              }
              removeEventListener('message', handler);
              if (data.ok) {
                console.log('RSign provider completed', { method, q });
                resolve(data.result);
              } else {
                console.log('RSign provider failed', { method, q, error: data.error.name });
                reject(data.error);
              }
              q += 2;
            }
            addEventListener('message', handler);
          })
          postMessage({ method, params, q }, '*'); // TODO: review security of '*' origin
          return done;
        },
        /** @param { boolean } state */
        set autoRefreshOnNetworkChange(state) {
          console.debug('autoRefreshOnNetworkChange ignored:', state);
        }
      });

      /**
       * "To notify sites of asynchronous injection,
       * MetaMask dispatches the ethereum#initialized event
       * on `window` immediately after the provider
       * has been set as `window.ethereum`."
       * -- https://github.com/MetaMask/detect-provider
       */
       const MetaMask = { initialized: 'ethereum#initialized' };

       dispatchEvent(new Event(MetaMask.initialized));
       console.log('RSign ethereum provider installed.');
    }
    install(/** @type {any} */(window), {
      addEventListener: window.addEventListener.bind(window),
      dispatchEvent: e => window.dispatchEvent(e),
      postMessage: (msg, origin, target = undefined) => window.postMessage(msg, origin, target),
      removeEventListener: window.removeEventListener.bind(window),
    });
  };
