import {getServerInstance, setServer} from 'pawajs/server.js'
import { DOMParser,parseHTML, HTMLElement} from 'linkedom'
import PawaComponent from './pawaComponent.js'
import { propsValidator, evaluateExpr,extractAtExpressions, reArrangeAttri,resumeAttribute, pawaGenerateId } from './utils.js'
import {AsyncLocalStorage} from'node:async_hooks'
import { If,For,State,Switch, Key } from'./power.js';
import PawaElement from'./pawaElement.js'

const PAWA_STORE_SYMBOL = Symbol.for('pawa.ssr.store');

const getStoreInstance = () => {
  if (!global[PAWA_STORE_SYMBOL]) {
    global[PAWA_STORE_SYMBOL] = new AsyncLocalStorage();
  }
  return global[PAWA_STORE_SYMBOL];
}
const store = getStoreInstance();
const useInsert=(obj={})=>{
  try{
    const appContext = store.getStore();
    if(appContext?.stateContext?.insert){
      Object.assign(appContext.stateContext.insert, obj);
    }
  }catch(error){
    if(isDevelopment){
      console.log(error.message,error.stack)
    }
  }
}

const setContext=()=>{
  const id=crypto.randomUUID()
  const setValue=(context={})=>{
    try{
      const appContext = store.getStore();
      if(appContext?.stateContext?.transportContext){
        appContext.stateContext.transportContext[id] = context;
    }
    }catch(error){
      if(isDevelopment){
        console.log(error.message,'this hook must be used inside of a component',error.stack)
      }
    }
  }
  return {
    id,
    setValue
  }
}
const accessChild=()=>{
  try{
    const appContext = store.getStore();
    if (appContext?.stateContext) {
      appContext.stateContext.accessChild = true;
    }
  }catch(error){
    if(isDevelopment){
      console.log(error.message,'this is from component',error.stack)
    }
  }
}
const useServer=()=>{
  try{
    const appContext = store.getStore();
    if (appContext?.stateContext) {
      appContext.stateContext.serializeData = true;
      const setServerData=(data={})=>{
        for (const [key,value] of Object.entries(data)) {
            if (typeof value !== 'function') {
              appContext.stateContext.fromSerialized[key]=value
            }
          }
      }
      const getServerData=()=>appContext.stateContext.fromSerialized
      return {setServerData,getServerData}
    }
  }catch(error){
    if(isDevelopment){
      console.log(error.message,'this is from component',error.stack)
    }
  }
}
const useContext=(context)=>{
  try{
    const appContext = store.getStore();
    const id=context?.id
    if(appContext?.stateContext?.transportContext && id){
      return appContext.stateContext.transportContext[id];
    }
    return {}
  }catch(error){
   if(isDevelopment){
      console.log(error.message,error.stack)
   }
  }
}
const useInnerContext=()=>{
  try{
    const appContext = store.getStore();
    return appContext?.stateContext?.innerContext || {};
  }catch(error){
    if(isDevelopment){
      console.log(error.message,error.stack)
    }
  }
}

const $state=(initialValue)=>{
  const state={value:null}
  if(typeof initialValue === 'function'){
    const res=initialValue()
    if(res instanceof Promise){
     state.async=true
     state.failed=false
     
    }else{
      state.value=initialValue()
    }
  } else{
    state.value=initialValue
    return state
  }
}
setServer({
  useContext,
  useInnerContext,
  useInsert,
  setContext,
  $state,
  accessChild,
  useServer
})

const components = new Map();
export const getPawaComponentsMap =()=>{
  return components ;
}
 const getStore=()=>{
  return store.getStore()
}

let isDevelopment
export const getDevelopment=()=>isDevelopment

/**
 * @type{string}
 */
const allServerAttr=['if','else','else-if','for','ref'];
export const getAllServerAttrArray=()=>{
  return allServerAttr;
}

const compoBeforeCall = new Set()
const compoAfterCall=new Set()
const renderBeforePawa=new Set()
const renderAfterPawa=new Set()
const renderBeforeChild=new Set()
const startsWithSet=new Set()
const fullNamePlugin=new Set()
const externalPlugin={}
const pawaAttributes=new Set()
const setPawaAttribute=(...attr)=>{
  attr.forEach(att=>{
    pawaAttributes.add(att)
  })
}
setPawaAttribute('if','else','else-if','for-each','ref','key')
export const getPawaAttributes=()=>pawaAttributes
/**
 * @typedef {{startsWith:string,fullName:string,plugin:(el:HTMLElement | PawaElement,attr:object)=>void}} AttriPlugin
 */
/**
 * @typedef {{
 * attribute?:{register:Array<AttriPlugin>},
 * component?:{
 * beforeCall?:(stateContext:PawaComponent,app:object)=>void,
 * afterCall?:(stateContext:PawaComponent,el:HTMLElement)=>void
 * },
 * renderSystem?:{
 *  beforePawa?:(el:HTMLElement,context:object)=>void,
 *  afterPawa?:(el:PawaElement)=>void,
 *  beforeChildRender?:(el:PawaElement)=>void
 * }
 * }} PluginObject
 */
/**
 * @param {Array<()=>PluginObject>} func
 */
export const PluginSystem=(...func)=>{
  func.forEach(fn=>{ 
    /**
     * @type {PluginObject}
     */
    if (typeof fn !== 'function') {
      console.warn('plugin must be a function that returns the plugin objects')
      return
    }
    const getPlugin=fn()
    // attributes plugin or extension
    
    if (getPlugin?.attribute) {
      getPlugin.attribute.register.forEach(attrPlugins =>{
        if (attrPlugins.fullName && attrPlugins.startsWith) {
          console.warn('Either Plugins FullName or startsWith. you are not required to use to of does plugin registers at this same entry.')
          return
        }
        if (attrPlugins?.fullName) {
          if (pawaAttributes.has(attrPlugins.fullName) ) {
            console.warn(`attribute plugin already exist ${attrPlugins.fullName}`)
            return
          }
          pawaAttributes.add(attrPlugins.fullName)
        fullNamePlugin.add(attrPlugins.fullName)
        externalPlugin[attrPlugins.fullName]=attrPlugins?.plugin
        }else if (attrPlugins?.startsWith) {
          if (pawaAttributes.has(attrPlugins.startsWith) ) {
          console.warn(`attribute plugin already exist ${attrPlugins.startsWith}`)
          return
        }
        pawaAttributes.add(attrPlugins.startsWith)
        startsWithSet.add(attrPlugins.startsWith)
        externalPlugin[attrPlugins.startsWith]=attrPlugins?.plugin
        }
      })
    }
    if (getPlugin?.component) {
      if (getPlugin.component?.beforeCall && typeof getPlugin.component?.beforeCall === 'function') {
        compoBeforeCall.add(getPlugin.component.beforeCall)
      }
      if (getPlugin.component?.afterCall && typeof getPlugin.component?.afterCall === 'function') {
        compoAfterCall.add(getPlugin.component.afterCall)
      }
    }
    if (getPlugin?.renderSystem) {
      if (getPlugin.renderSystem?.beforePawa && typeof getPlugin.renderSystem?.beforePawa === 'function') {
        renderBeforePawa.add(getPlugin.renderSystem?.beforePawa)
      }
      if (getPlugin.renderSystem?.afterPawa && typeof getPlugin.renderSystem?.afterPawa === 'function') {
        renderAfterPawa.add(getPlugin.renderSystem?.afterPawa)
      }
      if (getPlugin.renderSystem?.beforeChildRender && typeof getPlugin.renderSystem?.beforeChildRender === 'function') {
        renderBeforeChild.add(getPlugin.renderSystem?.beforeChildRender)
      }
    }
  })
}

export const useValidateComponent=(component,object)=>{
  if (typeof component === 'function' ) {
    if(component.name){
      component.validateProps=object
    }
  }
}

/**
 * @typedef {{
 *    formerContext:AppStateContextType,
 *    transportContext:object,
 *    mount:Array<()=>void>,
 *    innerContext:object
 * }} AppStateContextType
 */
/**
 * 
 * @param {import('./pawaElement.js').default} el
 * @returns 
 */
const component=async (el)=>{
    if(el._running){
        return
    }
   try {
    const slot=el._slots
    const document = el.ownerDocument
    const slots={}
    /**@type {AppStateContextType} */
    const oldAppContext=getStore().stateContext
    let stateContext={}
    let appContext={
      transportContext: {},
      innerContext:el._context,
      mount:[],
      formerContext:oldAppContext,
      name:el._componentName,
      insert:{},
      component:el._component,
      accessChild:false,
      serializeData:false,
      serialize:{},
      fromSerialized:{}
    }
    Object.assign(appContext.transportContext, oldAppContext?.transportContext || {})
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        slots[prop.getAttribute('prop')]=()=>prop.innerHTML
      }else{
        console.warn('sloting props must have prop attribute')
      }
    }) 
    const children=el._componentChildren
    const hydrate={
      children:'',
      props:{
        ...el._hydrateProps,
      },
      slots:{...slots},
    }
    if (isDevelopment) {
      hydrate.children=children
    }
    const id=pawaGenerateId(10)
    const encodeJSON = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-');
const comment = document.createComment(`component+${id}`);
const endComment=document.createComment(`end component+${id}+${el._componentName}`)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    /**
     * @type {import('./pawaComponent.js').default}
     */
    const component =el._component
    stateContext=component
    /**
 * 
 * @param {object} props 
 * @returns {object}
 */
stateContext._name=el._componentName

let done=true
if(Object.entries(el._component.validPropRule).length > 0){
  done=propsValidator(el._component.validPropRule,{...el._props,...slots},appContext.component._name,el.toString(),el)
}
appContext.component._prop={children,...el._props,...slots}

    const app = {
        children,
        ...slots,
        ...el._props
      }
      for (const fn of compoBeforeCall) {
            try {
            await fn(stateContext,app)
            } catch (error) {
              console.error(`Error in beforeCall for ${el._componentName}:`, error.message)
            }
          } 
      
    const div=document.createElement('div')
    el._setResumeAttr(`c-compo-${el._componentName}-${id}`)
    let compo=""
    try{
      if(done){
        store.getStore().stateContext=appContext
        compo=await component.component(app)
      }

    }catch(error){
      console.error(`error from PawaComponent.${appContext.component._name}`,error.message,error.stack)
    }
    if (appContext?.insert){
      Object.assign(el._context,appContext.insert)
    }
    // if(compo instanceOf Promise){}
    if(typeof compo !== 'boolean' && compo){
      div.innerHTML=compo
      }
          const findElement=div.querySelector('[--]') || div.querySelector('[r-]')
          if (findElement) {
            for (const [key,value] of Object.entries(el?._restProps)) {
                findElement.setAttribute(value.name,value.value)
              }
              findElement.removeAttribute('--')
              findElement.removeAttribute('r-')
        }
        
        // Handle multiple root nodes (Fragments)
        const newElements = Array.from(div.children)
        for (const fn of compoAfterCall) {
          try {
            // Note: passing the first child might be limiting if there are multiple, 
            // but keeping API consistent for now.
            await fn(appContext, newElements[0], el)
          } catch (error) {
            console.error(error.message,error.stack)
          }
        }

        
        hydrate.data=null
        if (appContext.serializeData) { // get serialized data 
          for (const [key,value] of Object.entries(appContext.fromSerialized)) {
            if (typeof value !== 'function') {
              appContext.serialize[key]=value
            }
          }
          hydrate.data=appContext.serialize
        }
        hydrate.context=[]
          for (const [key] of Object.entries(appContext.insert)) {
            hydrate.context.push(key)
          }
          comment.data=`component+${id}+${el._componentName}+${encodeJSON(hydrate)}`
        
        for (const newElement of newElements) {
          comment.parentElement.insertBefore(newElement, endComment)
          newElement.setAttribute('p:c', el.getAttribute('p:c'))
          
          Array.from(el.attributes).forEach((value) => {
            if (value.name.startsWith('c-')) {
              newElement.setAttribute(value.name, value.value)
            }
          })
          
          newElement.setAttribute(`c-c-${el._componentName}-${id}`, id)
          await render(newElement, el._context)
        }
        
        appContext.mount.forEach(async(call)=>{
          await call()
        })
        store.getStore().stateContext=appContext.formerContext
         } catch (error) {
    console.log(error.message,error.stack);
    
   }
}
const templates=async(el,context)=>{
  if(el._running)return
  const document = el.ownerDocument
       const comment=document.createComment(`<template>`)
       const endComment=document.createComment(`</template>`)
       el.replaceWith(endComment)
       
       endComment.parentElement.insertBefore(comment,endComment)
       let element=[]
       for (const child of Array.from(el.content.children)) {
         endComment.parentElement.insertBefore(child,endComment)
         element.push(child)
        }
        
        for (const [i, child] of element.entries()) {
          child.setAttribute('p:c',el.getAttribute('p:c'))
          if(i === 0){
            for (const attr of Array.from(el.attributes)) {
            if(attr.name.startsWith('c-')){
              child.setAttribute(attr.name,attr.value)
            }
          }
          }
          await render(child,el._context) 
      }
}
const textContentHandler = async(el) => {
  if (el._running || el._componentName) return;
  if (el._hasForOrIf()) {
    return;
  }
  const nodesMap = new Map();
  const currentHtmlString = el.outerHTML;
  el.setAttribute('c-t',true)
  const document = el.ownerDocument
  const comment=document.createComment(`textEvaluator-${el.innerHTML}`)
  el.appendChild(comment)
  // Get all text nodes and store their original content
  const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === 3);
  textNodes.forEach(node => {
    nodesMap.set(node, node.nodeValue);
  });

  // --- Evaluate and replace text content ---
  const evaluate = () => {
    try {
      textNodes.forEach(textNode => {
        let value = nodesMap.get(textNode); // Always start from original text

        const expressions = extractAtExpressions(value);
        expressions.forEach(({ fullMatch, expression }) => {
          const func = evaluateExpr(
            expression,
            el._context,
            `from text interpolation @{} - ${expression} at ${currentHtmlString}`
          );
          value = value.replace(fullMatch, String(func));
        });
        
        textNode.nodeValue = value;
      });
    } catch (error) {
      console.warn(`error at ${el._template} textcontent`);
      console.error(error.message, error.stack);
    }
  };
  
  evaluate();
  
};
const attributeHandler =async (el, attr) => {
  if (el._hasForOrIf()) {
    return;
  }
  if (el._running) {
    return;
  }
  el._replaceResumeAttr(attr.name,`c-at-${attr.name}`,attr.value)
  const currentHtmlString = el.outerHTML;
  const removableAttributes = new Set();
  removableAttributes.add('disabled');

  const evaluate = () => {
    try {
      let value = attr.value;
      const expressions = extractAtExpressions(value);

      expressions.forEach(({ fullMatch, expression }) => {
        const func = evaluateExpr(
          expression,
          el._context,
          `from text interpolation @{} - ${expression} at ${currentHtmlString} attribute ${attr.name}`
        );
        value = value.replace(fullMatch, String(func));
      });
      if (removableAttributes.has(attr.name)) {
        if (value) {
          el.setAttribute(attr.name, '');
        } else {
          el.removeAttribute(attr.name);
        }
      } else {
        el.setAttribute(attr.name, value);
      }
    } catch (error) {
      console.log(error.message, error.stack);
    }
  };

  evaluate();
  
};
  
/**
 * 
 * @param {PawaElement | HTMLElement} el 
 * @param {object} contexts 
 */
export const render =async (el, contexts = {}) => {
  if(el.hasAttribute('only-client')){
    el.removeAttribute('only-client')
    const template=el.ownerDocument.createElement('template')
    const comment=el.ownerDocument.createComment('only-client')
    el.replaceWith(comment)
    template.appendChild(el)
    comment.replaceWith(template)
    return
  }
  if (el.tagName === 'HEAD') {
    if (el.querySelector('title')) {
      el.ownerDocument.head.querySelector('title')?.remove()
    }
    Array.from(el.children).forEach(child => {
      el.ownerDocument.head.appendChild(child)
    })
    el.remove()
    return
  }
  
    const context={
        ...contexts
    }
    for (const fn of renderBeforePawa) {
      try {
        await fn(el,context)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
    
    PawaElement.Element(el,context)
    
     if(el.childNodes.some(node=>node.nodeType === 3 && node.nodeValue.includes('@{')) && !el._avoidPawaRender){
       await textContentHandler(el)  
     }
     let startAttribute=false
   const startObject={}
   //get startsWith plugin
   if (!el._avoidPawaRender) {
    startsWithSet.forEach( starts=>{
    
    el._attributes.forEach(attr =>{
      if(attr.name.startsWith(starts)){
        startAttribute=true
        startObject[attr.name]=starts
      }
    })
   })
   }
     for (const fn of renderAfterPawa) {
      try {
        await fn(el)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
    if (!el._avoidPawaRender) {
      
      const attributes = Array.from(el.attributes);
      for(const attr of attributes){
          if (directives[attr.name]) {
              await directives[attr.name](el,attr)  
          }else if(attr.value.includes('@{')){
            await  attributeHandler(el,attr)
          }else if (attr.name.startsWith('state-')) {
            await directives['state-'](el,attr)
          }
          else if(fullNamePlugin.has(attr.name)) {
          if(externalPlugin[attr.name]){
            const plugin= externalPlugin[attr.name]
            try{
              if (typeof plugin !== 'function') {
                console.warn(`${attr.name} plugin must be a function`)
                return
              }
             await plugin(el,attr)
            }catch(error){
              console.warn(error.message,error.stack)
            }
          }
        }else if(startAttribute){
          const name=startObject[attr.name]
          if(externalPlugin[name]){
            const plugin= externalPlugin[name]
            try{
              if (typeof plugin !== 'function') {
                console.warn(`${name} plugin must be a function`)
                return
              }
              await plugin(el,attr)
            }catch(error){
              console.warn(error.message,error.stack)
            }
          }
        }
          
      }
      if(el.tagName === 'TEMPLATE'){
        await templates(el)
        return
      }
      if (el._componentName) {
          await component(el)
          return
      }
    }
    for (const fn of renderBeforeChild) {
      try {
       await fn(el)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
if(!el._running){
   const children = Array.from(el.children);
   for(const child of children){
     await render(child, el._context);
   };
  
}

    el._setError()
}


const directives={
    'if':If,
    'for-each':For,
    'state-':State,
    'switch':Switch,
    'key':Key
}

export const startApp = async (html, context = {}, devlopment = false) => {
  const appContext = {
    context: context,
    stateContext: null,
  };
  isDevelopment = devlopment;
  const app = new DOMParser();
  
  const body = app.parseFromString(html, 'text/html');
  
  const div = body.firstElementChild; // Original app div
  const root = body.createElement('div'); // New root to track transformations
  root.appendChild(div?.cloneNode(true)); // Clone to preserve original structure

  await store.run(appContext, async () => {
    await render(root.firstElementChild, context); // Render into cloned div
  });
  return {
    element: root?.firstElementChild, // Return the transformed element
    toString: async () => root?.firstElementChild?.outerHTML, // Reflect transformed HTML
    head:body.head.innerHTML
  };
};
