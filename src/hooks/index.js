import { setServer } from "pawajs/src/server/index.js";
import { store } from "../global.js";

const pawaProxies = new WeakSet()

const isProxyable = (value) => {
  if (!value || typeof value !== 'object') return false
  if (value instanceof Date || value instanceof RegExp || value instanceof Promise) return false
  return Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype
}

const cloneValue = (value, seen = new WeakMap()) => {
  if (!isProxyable(value)) return value
  if (seen.has(value)) return seen.get(value)

  const clone = Array.isArray(value) ? [] : {}
  seen.set(value, clone)
  for (const key of Reflect.ownKeys(value)) {
    clone[key] = cloneValue(value[key], seen)
  }
  return clone
}

const getRequestState = (target, ctx) => {
  if (!ctx.states) ctx.states = new Map()
  if (!ctx.states.has(target)) {
    ctx.states.set(target, {
      ...target,
      value: cloneValue(target.value)
    })
  }
  return ctx.states.get(target)
}

const proxyValue = (value, ctx) => {
  if (!isProxyable(value)) return value
  if (!ctx.proxies) ctx.proxies = new WeakMap()
  if (ctx.proxies.has(value)) return ctx.proxies.get(value)

  const proxy = new Proxy(value, {
    get(target, prop, receiver) {
      ctx.asClient = true
      if (ctx.graph) ctx.graph.state = true
      return proxyValue(Reflect.get(target, prop, receiver), ctx)
    },
    set(target, prop, nextValue, receiver) {
      return Reflect.set(target, prop, cloneValue(nextValue), receiver)
    },
    deleteProperty(target, prop) {
      return Reflect.deleteProperty(target, prop)
    }
  })

  ctx.proxies.set(value, proxy)
  pawaProxies.add(proxy)
  return proxy
}

export const isProxy = (value) => pawaProxies.has(value)

const $state = (initialValue,section) => {
  const id=crypto.randomUUID()
  const state = { value: null ,id};
  const ctx=store.getStore()
  const graph=ctx.graph

  if (typeof initialValue === 'function') {
    const res = initialValue();
    if (res instanceof Promise) {
      
      if(!section){
        throw new Error("[Error]:State with Promise needs the second param for storage");
      }
      if (!graph?.promise) {
        graph.promise=[]
      }
      
      graph.promise.push({promise:res,name:section})
      state.async = true;
      state.failed = false;
      state.retry = () => {};
    } else {
      state.value = res;
    }
  } else {
    state.value = initialValue;
  }
  
  graph.state=true

  const proxy = new Proxy(state, {
    get(target, prop, receiver) {
      const request = store.getStore()
      request.asClient=true
      request.graph.state=true
      const localState = getRequestState(target, request)
      return proxyValue(Reflect.get(localState, prop, receiver), request)
    },
    set(target, prop, value, receiver) {
      const request = store.getStore()
      request.asClient=true
      const localState = getRequestState(target, request)
      return Reflect.set(localState, prop, cloneValue(value), receiver)
    }
  });
  pawaProxies.add(proxy)
  return proxy
};

const getComponentGraph=()=>{
    const stores=store.getStore().graph
    return stores
}
const setComponentGraph=(graph)=>{
    store.getStore().graph=graph
}
export const setServerHook=()=>{
    setServer({
        getComponentGraph:getComponentGraph,
        setComponentGraph:setComponentGraph,
        $state:$state,
        isProxy
    })
}
