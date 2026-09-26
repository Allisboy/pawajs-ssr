import { store } from "./global.js";
import { getServerInstance } from "pawajs/src/server/index.js";

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const pawaGenerateId = (length = 6) => {
  const rb = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[rb[i] % alphabet.length];
  }
  return result;
};

export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const extractAtExpressions=(template) =>{
  const results = [];
  const regex = /@\{/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    let start = match.index + 2; // skip '@('
    let depth = 1;
    let i = start;

    while (i < template.length && depth > 0) {
      if (template[i] === '{') depth++;
      else if (template[i] === '}') depth--;
      i++;
    }

    if (depth === 0) {
      const expression = template.slice(start, i - 1).trim();
      results.push({
        fullMatch: template.slice(match.index, i),
        expression,
        start: match.index,
        end: i,
      });
    }
  }

  return results;
}

const containsProxy = (value, seen = new WeakSet()) => {
  const serverIsProxy = getServerInstance().isProxy
  if (typeof serverIsProxy !== 'function' || value === null || value === undefined) {
    return false
  }
  if (typeof value !== 'object' && typeof value !== 'function') return false
  if (serverIsProxy(value)) return true
  if (seen.has(value)) return false
  seen.add(value)

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && !Array.isArray(value)) return false

  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ('value' in descriptor && containsProxy(descriptor.value, seen)) return true
  }
  return false
}
export const isComponentClient=async(callback)=>{
  const entry = store.getStore()
  entry.asClient = false
  try {
    const result =await callback()
    return { result, client: entry.asClient}
  } finally {
    entry.asClient = false
  }
}
export const isProxy =(valueOrCallback) => {
  if (typeof valueOrCallback !== 'function') {
    return containsProxy(valueOrCallback)
  }

  const entry = store.getStore()
  if (!entry) {
    const result = valueOrCallback()
    return { result, client: containsProxy(result) }
  }

  entry.asClient = false
  try {
    const result =valueOrCallback()
    return { result, client: entry.asClient || containsProxy(result) }
  } finally {
    entry.asClient = false
  }
}