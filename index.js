import {getServerInstance, setServer} from '../src/pawajs/server.js'
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
    if(__pawaDev){
      console.log(error.message,error.stack)
    }
  }
}
const useAsync=()=>{
  try {
    const appContext=store.getStore();
    if (appContext?.stateContext) {
      const keep=appContext?.stateContext
      return {
        $async:(callback)=>{
          if (typeof callback === 'function') {
            store.getStore().stateContext=keep
            const res=callback()
            return res
          }
        },
        onSuspense:(html)=>{
          if (typeof html === 'string') {
            keep.suspense=html
          }
        }
      }
    }
  } catch (error) {
    
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
  const appContext = store.getStore().stateContext;
  try{
    if (appContext) {
      appContext.useServer=true
      appContext.serializeData = true;
      const setServerData=(data={})=>{
        
        for (const [key,value] of Object.entries(data)) {
            if (typeof value !== 'function') {
              appContext.fromSerialized[key]=value
            }
          }
      }
      const getServerData=()=>appContext.fromSerialized
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
     state.retry=()=>{}
     
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
  useServer,
  useAsync
})
export const pawaForServer=setServer
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
const component=async (el,stream)=>{
    if(el._running){
        return
    }
   try {
    const slot=el._slots
    const document = el.ownerDocument
    const slots={}
    /**@type {AppStateContextType} */
    const oldAppContext=store.getStore().stateContext
    // console.log(oldAppContext)
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
      fromSerialized:{},
      useServer:false,
      suspense:'',
      carrier:'',
      pc:el.getAttribute('p:c')
      
    }
    Object.assign(appContext.transportContext, oldAppContext?.transportContext || {})
    const slotHydrates={}
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        const html=prop.innerHTML
        slots[prop.getAttribute('prop')]=()=>html
        slotHydrates[prop.getAttribute('prop')]=html
      }else{
        console.warn('sloting props must have prop attribute')
      }
    }) 
    const children=el._componentChildren
    const hydrate={
      children:children,
      props:{
        ...el._hydrateProps,
      },
      slots:{...slotHydrates},
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
            console.error(`Error in beforeCall for ${el._componentName}:`, error.message,error.stack)
             __pawaDev.setError({ 
                    el:el, 
                    msg:`from  compoBeforeCall${el._componentName}:`+ error.message + error.stack, 
                    directives:'plugin', 
                    stack:error.stack, 
                    template:el?._template, 
                 })
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
             __pawaDev.setError({ 
                    el:el, 
                    msg:`error from PawaComponent.${appContext.component._name}`+ error.message + error.stack, 
                    directives:el.tagName, 
                    stack:error.stack, 
                    template:el?._template, 
                 })
    }
          if (appContext?.insert){
      Object.assign(el._context,appContext.insert)
    }
     
    if(typeof compo !== 'boolean' && typeof compo === 'string'){
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
            await render(newElement, el._context,stream)
          
        }              
        store.getStore().stateContext=appContext.formerContext
         } catch (error) {
    console.log(error.message,error.stack);
     __pawaDev.setError({ 
                    el:el, 
                    msg:`from  ${el.tagName} component`, 
                    directives:'component', 
                    stack:error.stack, 
                    template:el?._template, 
                 })
    
   }
}
/**
 * 
 * @param {import('./pawaElement.js').default} el
 * @returns 
 */
const streamingComponent=async (el,stream)=>{
    if(el._running){
        return
    }
   try {
    const slot=el._slots
    const document = el.ownerDocument
    const slots={}
    /**@type {AppStateContextType} */
    const oldAppContext=store.getStore().stateContext
    // console.log(oldAppContext)
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
      fromSerialized:{},
      useServer:false,
      suspense:'',
      carrier:'',
      pc:el.getAttribute('p:c')
      
    }
    Object.assign(appContext.transportContext, oldAppContext?.transportContext || {})
    const slotHydrates={}
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        const html=prop.innerHTML
        slots[prop.getAttribute('prop')]=()=>html
        slotHydrates[prop.getAttribute('prop')]=html
      }else{
        console.warn('sloting props must have prop attribute')
      }
    }) 
    const children=el._componentChildren
    const hydrate={
      children:children,
      props:{
        ...el._hydrateProps,
      },
      slots:{...slotHydrates},
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
            console.error(`Error in beforeCall for ${el._componentName}:`, error.message,error.stack)
             __pawaDev.setError({ 
                    el:el, 
                    msg:`from  compoBeforeCall${el._componentName}:`+ error.message + error.stack, 
                    directives:'plugin', 
                    stack:error.stack, 
                    template:el?._template, 
                 })
          }
        } 
        
        const div=document.createElement('div')
        el._setResumeAttr(`c-compo-${el._componentName}-${id}`)
    let compo=""
    let isBoundary=false
    try{
      if(done){
      
        store.getStore().stateContext=appContext
        compo=component.component(app)
         isBoundary=appContext.suspense && appContext.useServer
        if (compo instanceof Promise && !isBoundary) {
          compo=await compo.then((res)=>res)
        }
      }

    }catch(error){
      console.error(`error from PawaComponent.${appContext.component._name}`,error.message,error.stack)
             __pawaDev.setError({ 
                    el:el, 
                    msg:`error from PawaComponent.${appContext.component._name}`+ error.message + error.stack, 
                    directives:el.tagName, 
                    stack:error.stack, 
                    template:el?._template, 
                 })
    }
          if (appContext?.insert){
      Object.assign(el._context,appContext.insert)
    }
    if (isBoundary) {
      store.getStore().batch.push({
        component:compo,
        id:id,
        comment:{
          hydrate:hydrate,
          encodeJSON:encodeJSON,
          name:el._componentName
        },
        appContext:appContext,
        context:{...el._context},
        restProps:el._restProps,
        hydrate:hydrate
      })
      
    }
     if(isBoundary){
      compo=`<div id="p${id}">${appContext.suspense}</div>`
    }
    if(typeof compo !== 'boolean' && typeof compo === 'string'){
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
          stream(`<!--${comment.data}-->`)
        
        for (const newElement of newElements) {
          comment.parentElement.insertBefore(newElement, endComment)
          if (!isBoundary) {
            newElement.setAttribute('p:c', el.getAttribute('p:c'))
          }else{
            newElement.setAttribute('p:c',el.getAttribute('p:c'))
            newElement.setAttribute('p-async', el.getAttribute('p:c'))
          }
          Array.from(el.attributes).forEach((value) => {
            if (value.name.startsWith('c-')) {
              newElement.setAttribute(value.name, value.value)
            }
          })
          
          newElement.setAttribute(`c-c-${el._componentName}-${id}`, id)
          
          
            await render(newElement, el._context,stream)
          
        }
        stream(`<!--${endComment.data}-->`)
        
        appContext.mount.forEach(async(call)=>{
          await call()
        })
  
        

        store.getStore().stateContext=appContext.formerContext
         } catch (error) {
    console.log(error.message,error.stack);
     __pawaDev.setError({ 
                    el:el, 
                    msg:`from  ${el.tagName} component`, 
                    directives:'component', 
                    stack:error.stack, 
                    template:el?._template, 
                 })
    
   }
}
const templates=async(el,stream)=>{
  if(el._running)return
  const document = el.ownerDocument
       const comment=document.createComment(`<template>`)
       const endComment=document.createComment(`</template>`)
       el.replaceWith(endComment)
       
       endComment.parentElement.insertBefore(comment,endComment)
       stream(`<!--${comment.data}-->`)
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
          await render(child,el._context,stream) 
      }
      stream(`<!--${endComment.data}-->`)
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
          const func = el._evaluateExpr(
            expression,
            el._context,
            `from text interpolation @{} - ${expression} at ${currentHtmlString}`
          );
          if (expression === '') {
            return
          }
          value = value.replace(fullMatch, String(func));
        });
        
        textNode.nodeValue = value;
      });
    } catch (error) {
      console.warn(`error at ${el._template} textcontent`);
      console.error(error.message, error.stack,`error at ${el._template} textcontent`);
      __pawaDev.setError({ 
           el:el, 
           msg:`Error from textHandler`+ error.message + error.stack, 
           directives:el.tagName, 
           stack:error.stack, 
           template:el?._template, 
        }) 
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
        const func =el._evaluateExpr(
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
       __pawaDev.setError({ 
           el:el, 
           msg:`error from Attribute Handler`+ error.message + error.stack, 
           directives:'Attribute Handler', 
           stack:error.stack, 
           template:el?._template, 
        })
    }
  };

  evaluate();
  
};
  const singleElement=new Set()
  const setSingle=(...string)=>{
    string.forEach(v => singleElement.add(v))
  }
  setSingle('img','br')
/**
 * 
 * @param {PawaElement | HTMLElement} el 
 * @param {object} contexts 
 */
export const render =async (el, contexts = {},stream) => {
  const isStream=store.getStore().stream
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
              await directives[attr.name](el,attr,stream)  
          }else if(attr.value.includes('@{')){
            await  attributeHandler(el,attr)
          }else if (attr.name.startsWith('state-')) {
             directives['state-'](el,attr)
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
        await templates(el,stream)
        return
      }
      if (el._componentName) {
        if(isStream){
          await streamingComponent(el,stream)
          return
        }else{
          await component(el,stream)
          return
        }
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
  const attr=Array.from(el.attributes).map(att=>`${att.name}="${att.value}"`).join(' ')
  const isSingle=singleElement.has(el.tagName.toLowerCase())
  if (isSingle) {
    stream(`<${el.tagName.toLowerCase()} ${attr} />`)
  }else{
    stream(`<${el.tagName.toLowerCase()} ${attr} >`)
  }
   const children = el.childNodes;
   for(const child of children){
    if (child.nodeType === 3) {
      stream(child.nodeValue)
    }else if (child.nodeType === 8) {
      stream(`<!--${child.nodeValue}-->`)
    }else if (child.nodeType === 1){
      await render(child, el._context,stream);
    }
   };
   if (!isSingle) {
    stream(`</${el.tagName.toLowerCase()}>`)
   }
  
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
    stream:false
  };
  isDevelopment = devlopment;
  const app = new DOMParser();
  
  const body = app.parseFromString(html, 'text/html');
  
  const div = body.firstElementChild; // Original app div
  const root = body.createElement('div'); // New root to track transformations
  root.appendChild(div?.cloneNode(true)); // Clone to preserve original structure
const fakeStream=(html)=>{}
  await store.run(appContext, async () => {
    await render(root.firstElementChild, context,fakeStream); // Render into cloned div
  });
  return {
    element: root?.firstElementChild, // Return the transformed element
    toString: async () => root?.firstElementChild?.outerHTML, // Reflect transformed HTML
    head:body.head.innerHTML
  };
};

export const startStreamApp = async (html, context = {},stream,{templateStart,templateEnd}) => {
  const appContext = {
    context: context,
    stateContext: null,
    useServer:false,
    batch:[],
    stream:true
  };
  const app = new DOMParser();
  
  const body = app.parseFromString(html, 'text/html');
  
  const div = body.firstElementChild; // Original app div
  
  const root = body.createElement('div'); // New root to track transformations
  root.appendChild(div?.cloneNode(true)); // Clone to preserve original structure
  await store.run(appContext, async () => {
    stream(templateStart)
    stream('<div id="app">')
    await render(root.firstElementChild, context,stream); // Render into cloned div
    stream('</div>')
    const batchs=store.getStore().batch
  
      // stream(`<script>console.log('first run') </script>`)
      stream(`<script>
        if (window?.__pawaDev && !window?.__pawaHasStarted) {
        window?.__startClient()
        window.__pawaHasStarted=true
        __startClient=null
      } </script>`)
           // ===== RESOLVE BATCHED ASYNC COMPONENTS =====
        let batch = store.getStore().batch;
        let maxDepth = 10; // Prevent infinite loops
        let depth = 0;
        
        while (batch.length > 0 && depth < maxDepth) {
            // console.log(`Resolving batch depth ${depth}: ${batch.length} components`);
            
            // Clear the batch for this iteration
            const currentBatch = [...batch];
            store.getStore().batch = [];
            
            // Resolve all in parallel
            await Promise.allSettled(
  currentBatch.map(item => resolvesAsync({...item}, body, stream))
);
            
            // Check if new async components were discovered
            batch = store.getStore().batch;
            depth++;
        }
        stream(`<script>
            if (window?.__pawaDev && !window?.__pawaHasStarted && window?.__startClient !== null) {
                window?.__startClient();
                window.__pawaHasStarted = true;
                __startClient = null;
            } else {
                window.__shouldStart = true;
            }
        </script>`);
  });
   const errors=__pawaDev.errors
    const errorHtml = errors?.length ? `
    <div pawa-avoid style="position:fixed; top:0; left:0; width:100vw; height:100vh; background-color:#1a1a1a; z-index:99999; overflow-y:auto; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding:2rem; box-sizing:border-box;">
      <h1 style="color:#ff6b6b; margin-top:0; border-bottom:1px solid #333; padding-bottom:1rem;">PawaJS Error Overlay</h1>
      ${errors.map((err, i) => `
        <div style="background-color:#242424; border:1px solid #333; border-radius:0.5rem; padding:1.5rem; margin-bottom:1.5rem; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.5);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h2 style="color:#e0e0e0; margin:0; font-size:1.25rem;">${err.directives || 'Runtime Error'}</h2>
            <span style="background-color:#333; color:#888; padding:0.25rem 0.5rem; border-radius:0.25rem; font-size:0.75rem;">Error #${i + 1}</span>
          </div>
          
          <div style="margin-bottom:1rem;">
            <p style="color:#ff8787; margin:0; font-weight:bold;">${err.msg}</p>
          </div>

          ${err.template ? `
          <div style="margin-bottom:1rem;">
            <h3 style="color:#888; font-size:0.875rem; text-transform:uppercase; margin:0 0 0.5rem 0;">Template Context</h3>
            <pre style="background-color:#111; color:#a8a8a8; padding:1rem; border-radius:0.25rem; overflow-x:auto; margin:0; border:1px solid #333;"><code>${err.template.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
          ` : ''}

          <div>
            <h3 style="color:#888; font-size:0.875rem; text-transform:uppercase; margin:0 0 0.5rem 0;">Stack Trace</h3>
            <pre style="background-color:#111; color:#888; padding:1rem; border-radius:0.25rem; overflow-x:auto; margin:0; border:1px solid #333; font-size:0.875rem; line-height:1.5;"><code>${err.stack.split('\n').map(line => {
              const escaped = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              return escaped.replace(/((?:[a-zA-Z]:\\|\/)[^:)]+):(\d+):(\d+)/g, (match, path, l, c) => {
                return `<a href="/__open-in-editor?file=${encodeURIComponent(path + ':' + l + ':' + c)}" onclick="event.preventDefault(); fetch(this.href);" style="color:#64b5f6; text-decoration:underline; cursor:pointer;">${match}</a>`
              })
            }).join('\n')}</code></pre>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''
    __pawaDev.errors=[]
    stream(errorHtml)
  stream(templateEnd)
};

const resolvesAsync=async({component,
        id:id,
        comment:{
          encodeJSON,
          name
        },
        appContext,context,restProps,hydrate},root,stream,index)=>{
          let chunk=''
          const bufferStream=(string)=>{
            chunk+=string
          }
          bufferStream(`<div id="p${id}" hidden>`)
      store.getStore().stateContext=appContext
      const compo=await component.then((res)=>res)
      const div=root.createElement('div')
      let commentData=''
      if(typeof compo !== 'boolean' && compo){
      div.innerHTML=compo
      }
          const findElement=div.querySelector('[--]') || div.querySelector('[r-]')
          if (findElement) {
            for (const [key,value] of Object.entries(restProps)) {
                findElement.setAttribute(value.name,value.value)
              }
              findElement.removeAttribute('--')
              findElement.removeAttribute('r-')
        }
        
        const newElement=div.firstElementChild
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
          commentData=`component+${id}+${name}+${encodeJSON(hydrate)}`
        if (newElement) {
         await render(newElement,{context,...appContext.insert},bufferStream)
        }
        bufferStream(`</div>`)
        bufferStream(`
          <script class="p${id}">
            const s${id}=()=>{
              let p=document.querySelectorAll("#p${id}")
              if(p.length < 2){
                if(p[0]) p[0].remove()
                document.querySelector('.p${id}').remove()
                return
              }
            let c=p[0].previousSibling
            c.data='${commentData}'
            p[0].remove()
            const sc=p[0]?._stateContext
            let ec=c.nextSibling
            let fc=p[1].firstElementChild
            p[0].removeAttribute('pawa-avoid')
            Array.from(p[0].attributes).forEach(a => {
              if(a.name === 'p-async') return
              if (a.name === 'p:c') {
                let o=a.value + (fc.getAttribute('p:c') || '')
                fc.setAttribute('p:c',o)
              }else{
                fc.setAttribute(a.name,a.value)
                }
            });
            p[1].childNodes.forEach(e => {
              c.parentElement.insertBefore(e,ec)
            });
            if (window?.__pawaDev) {
              window.__pawaStream(fc,p[0]._context,sc)
            }
            p[1].remove()
              }
            s${id}()
            document.querySelector('.p${id}').remove()
          </script>
          `)
        stream(chunk)  
}

function streamErrorFallback(id, stream) {
    stream(`
        <div hidden id="R${id}">
            <div class="async-error">
                <p>⚠️ Failed to load content</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        </div>
        <script>
            (function() {
                try {
                    var p = document.getElementById("p${id}");
                    var r = document.getElementById("R${id}");
                    if (p && r) {
                        p.innerHTML = r.innerHTML;
                        p.classList.add('error-state');
                        r.remove();
                    }
                } catch (e) {
                    console.error('Error handling fallback:', e);
                }
            })();
        </script>
    `);
}