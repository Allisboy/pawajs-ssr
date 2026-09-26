import { Document, DocumentFragment, DOMParser } from "linkedom";
import {AsyncLocalStorage} from'node:async_hooks'
const PAWA_STORE_SYMBOL = Symbol.for('pawa.ssr.store');

const getStoreInstance = () => {
  if (!global[PAWA_STORE_SYMBOL]) {
    global[PAWA_STORE_SYMBOL] = new AsyncLocalStorage();
  }
  return global[PAWA_STORE_SYMBOL];
}
getStoreInstance()
export const store = getStoreInstance();
export const dom = new DOMParser();

