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
     * }} io
     */
    function install(target, { addEventListener, dispatchEvent, postMessage }) {
      // console.debug('install...');
      const { freeze } = Object;

      target.ethereum = freeze({
        request: ({ method, params }) => {
          console.log('@@@handling ethereum provider request:', { method, params });
          const done = new Promise((resolve, _reject) => {
            addEventListener(RSignMessageType, async (event) => {
              resolve(event.data); // TODO: static type for RSignMessageType
            });
          })
          postMessage({ method, params }, '*');
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
    });
  };
