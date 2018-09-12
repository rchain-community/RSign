/** messageBus - message passing data structures
@flow strict
 */

/*::
export interface BusPort {
  postMessage(msg: BusMessage | BusReply): void,
  listen(cb: (BusMessage | BusReply) => boolean): void
}

export interface FarRef {
  invoke(method: string, locals: Array<FarRef>, ...args: Array<mixed>): Promise<mixed>
}

export interface FarRef2 {
  invokeRef(method: string, refs: Array<string>, ...args: Array<mixed>): Promise<mixed>
}

export type BusMessage = {
  kind: 'invoke',
  target: string,
  method: string,
  refs: Array<string>,
  args: Array<mixed>,
  seq?: number
}

export type SuccessReply = {
  kind: 'success',
  result: mixed,
}

export type FailureReply = {
  kind: 'failure',
  message: string
}

export type BusReply = SuccessReply | FailureReply;

export interface BusTarget {
  receive(msg: BusMessage): boolean
}

export interface BusDelayedTarget {
  receive(msg: BusMessage, cb: (BusReply) => void): true | void
}

type PendingWork = {
  resolve: (v: mixed) => void,
  reject: (messge: string) => void
}
 */

export default function messageBus(_port /*: BusPort */, _label /*: string*/) {
  throw new TypeError('not implemented');
}

export function asStr(x /*: mixed*/) /*: string */ {
  if (typeof x !== 'string') { return ''; }
  return x;
}

export function objGuard(x /*: mixed */) /*: { [string]: mixed } */ {
  if (typeof x !== 'object') { return {}; }
  if (x === null) { return {}; }
  return x;
}

function arrayOf/*:: <T>*/(x /*: mixed */, subGuard /*: (mixed) => T */) /*: Array<T> */ {
  if (!(Array.isArray(x))) { return []; }
  return x.map(subGuard);
}


export function asBusMessage(x /*: mixed */) /*: BusMessage */ {
  const msg = objGuard(x);
  if (msg.kind !== 'invoke') { throw new TypeError('expected invoke'); }

  return {
    kind: 'invoke',
    target: asStr(msg.target),
    method: asStr(msg.method),
    refs: arrayOf(msg.refs, asStr),
    args: arrayOf(msg.args, arg => arg),
  };
}


export function asBusReply(x /*: mixed */) /*: BusReply */ {
  const msg = objGuard(x);
  switch (msg.kind) {
    case 'success':
      return { kind: 'success', result: msg.result };
    case 'failure':
      return { kind: 'failure', message: asStr(msg.message) };
    default:
      throw new TypeError(`bad message kind: ${String(msg.kind)}`);
  }
}
