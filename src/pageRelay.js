// inspired by EIP 1102: Opt-in provider access
// https://eips.ethereum.org/EIPS/eip-1102
// https://github.com/MetaMask/metamask-extension/pull/4703

// @flow strict

import { asBusMessage, asBusReply } from './messageBus.js';

const def = Object.freeze;

/*::
import { type BusTarget, type BusMessage, type BusReply, type BusPort } from './messageBus.js';
*/

// combination of rchain domain and randomly chosen data.
const RCHAIN_SIGNING = 'rchain.coop/6kbIdoB2';

function startRelay(runtime /*: chrome$runtime*/, pgPort /*: BusPort*/) {
  console.log('startRelay...');

  const toPage = oneWayForwarder(`${RCHAIN_SIGNING}/page`, pgPort);

  runtime.onMessage.addListener((x, _sender, _sendResponse) => {
    try {
      const msg = asBusMessage(x);
      toPage.receive(msg);
    } catch (_) {
      // never mind
    }
  });

  const toPopup = callbackForwarder(`${RCHAIN_SIGNING}/popup`, runtime, pgPort);
  pgPort.listen((msg /*: BusMessage | BusReply*/) => {
    if (msg.kind !== 'invoke') { return false; }
    return toPopup.receive(msg);
  });
}


// ISSUE: belongs in messageBus.js?
function callbackForwarder(name, destPort, srcPort) /*: BusTarget*/ {
  function receive(msg) {
    if (msg.target !== name) { return false; }
    console.log('forwarder sending to runtime', msg);
    destPort.sendMessage(msg, (response /*: mixed */) => {
      console.log('forwarder forwarding reply from runtime', response);
      srcPort.postMessage(asBusReply(response));
    });
    return true;
  }
  return def({ receive });
}


// ISSUE: belongs in messageBus.js?
function oneWayForwarder(name, port) /*: BusTarget*/ {
  function receive(maybeMsg) {
    const msg = maybeMsg || {};
    if (msg.target !== name) { return false; }

    const pgInvoke /*: BusMessage */ = {
      kind: 'invoke',
      target: msg.target,
      method: msg.method || '',
      refs: msg.refs || [],
      args: msg.args || [],
    };

    console.log('pageRelay relaying', pgInvoke.method, pgInvoke);
    port.postMessage(pgInvoke);
    return true;
  }

  return def({ receive });
}


/* eslint-disable no-undef*/
startRelay(chrome.runtime, {
  postMessage: msg => window.postMessage(msg, '*'),
  listen: cb => window.addEventListener('message', event => cb(event.data)),
});
