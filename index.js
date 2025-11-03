const { DOMParser,parseHTML, HTMLElement} =require('linkedom')
const {setServer}=require('pawajs/server')
const PawaComponent = require('./pawaComponent.js')
const { sanitizeTemplate,propsValidator, evaluateExpr,extractAtExpressions } = require('./utils.js');
const {AsyncLocalStorage}=require('node:async_hooks')

const useInsert=(obj={})=>{
  try{
    const current=store.getStore().stateContext
    
    if(current?.insert){
      Object.assign(store.getStore().stateContext.insert,obj)
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
    const current=store.getStore().stateContext
    if(current?.transportContext){
      store.getStore().stateContext.transportContext[id]=context
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
const useContext=(context)=>{
  try{
    const current=store.getStore().stateContext
    // console.log(current)
    const id=context?.id
    if(current?.transportContext && id){
      return current.transportContext[id]
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
    const context=store.getStore().stateContext
    return context?.innerContext || {}
  }catch(error){
    if(isDevelopment){
      console.log(error.message,error.stack)
    }
  }
}

const $state=async(initialValue)=>{
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
  $state
})

const components = new Map();
exports.getPawaComponentsMap =()=>{
  return components ;
}
const store=new AsyncLocalStorage()
const getStore=()=>{
  return store.getStore()
}

let isDevelopment
const getDevelopment=()=>isDevelopment
exports.getDevelopment=getDevelopment

/**
 * @type{string}
 */
const allServerAttr=['if','else','else-if','for','key','ref'];
const getAllServerAttrArray=()=>{
  return allServerAttr;
}
exports.getAllServerAttrArray=getAllServerAttrArray

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
setPawaAttribute('if','else','else-if','s-for','s-ref','s-key')
exports.getPawaAttributes=()=>pawaAttributes
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

exports.useValidateComponent=(component,object)=>{
  if (typeof component === 'function' ) {
    if(component.name){
      component.validateProps=object
    }
  }
}
const PawaElement = require('./pawaElement.js')
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
    const {document}=parseHTML()
    const slots={}
    /**@type {AppStateContextType} */
    const oldAppContext=getStore().stateContext
    let stateContext={}
    let appContext={
      transportContext:oldAppContext?.transportContext || {},
      innerContext:el._context,
      mount:[],
      formerContext:oldAppContext,
      name:el._componentName,
      insert:{},
      component:el._component,
    }
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        slots[prop.getAttribute('prop')]=prop.innerHTML
      }else{
        console.warn('sloting props must have prop attribute')
      }
    }) 
    const hydrate={
      props:{
        ...el._hydrateProps
      },
      slot:{
        ...slots
      }
    }
    const id=crypto.randomUUID()
    const encodeJSON = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
const comment = document.createComment(`component-${id}-${el._componentName}-${encodeJSON(hydrate)}`);
const endComment=document.createComment(`end component-${id}-${el._componentName}-${encodeJSON(hydrate)}`)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    const children=el._componentChildren
    /**
     * @type {import('./pawaComponent.js').default}
     */
    const component =el._component
    stateContext=component
    const insert=(obj={})=>{
       Object.assign(store.getStore().stateContext.insert,obj)
    }
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
        app:{
          insert,
          useInnerContext:()=>el._context
        },
        ...slots,
        ...el._props
      }
      for (const fn of compoBeforeCall) {
            try {
            await fn(stateContext,app)
            } catch (error) {
              console.error(error.message,error.stack)
            }
          } 
      
    const div=document.createElement('div')
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
        for (const fn of compoAfterCall) {
          try {
          await fn(appContext,div?.firstElementChild,el)
          } catch (error) {
            console.error(error.message,error.stack)
          }
        }
        const newElement=div.firstElementChild
        if (newElement) {
        comment.parentElement.insertBefore(newElement,endComment)
        el.attributes.forEach(attr =>{
          if (attr.name.startsWith('resume-')) {
            newElement.setAttribute(attr.name,attr.value)
          }
        })
        newElement.setAttribute('resume-component',id)
        await render(newElement,el._context)
      }
        
        appContext.mount.forEach(async(call)=>{
          await call()
        })
        store.getStore().stateContext=appContext.formerContext
         } catch (error) {
    console.log(error.message,error.stack);
    
   }
}
const templates=(el,context)=>{
  if(el._running)return
  const {document}=parseHTML()
       const id=crypto.randomUUID()
       const comment=document.createComment(`template-${id}`)
       const endComment=document.createComment(`template-${id}`)
       el.replaceWith(endComment)
       
       endComment.parentElement.insertBefore(comment,endComment)
       let element=[]
       Array.from(el.content.children).forEach((child) => {
           endComment.parentElement.insertBefore(child,endComment)
           element.push(child)
       })
       element.forEach(child=>{
          el.attributes.forEach(attr=>{
            if(attr.name.startsWith('resume-')){
              child.setAttribute(attr.name,attr.value)
            }
          })
          child.setAttribute('resume-template',id)
          render(child,el._context,tree) 
      })
}
const textContentHandler = (el) => {
  if (el._running) return;

  const nodesMap = new Map();
  const currentHtmlString = el.outerHTML;

  const {document}=parseHTML()
  const comment=document.createComment(`textEvalautor-${el.innerHTML}`)
  el.setAttribute('resume-text',true)
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
        // console.log(expressions);
        expressions.forEach(({ fullMatch, expression }) => {
          const func = evaluateExpr(
            expression,
            el._context,
            `from text interpolation @{} - ${expression} at ${currentHtmlString}`
          );
          value = value.replace(fullMatch, String(func));
        });
        // console.log(value);
        textNode.nodeValue = value;
      });
    } catch (error) {
      console.warn(`error at ${el._template} textcontent`);
      console.error(error.message, error.stack);
    }
  };

  evaluate();
};
const attributeHandler = (el, attr) => {
  if (el._hasForOrIf()) {
    return;
  }
  if (el._running) {
    return;
  }
  el.setAttribute(`resume-attr-${attr.name}`,attr.value)
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
   * @param {HTMLElement} el
   */
  const innerHtml = (el,context) => {
    if (el.getAttribute('client')) {
      return
    }
    const {document}=parseHTML()
    const nodesMap = new Map();
  
    // Get all text nodes and store original value
    const textNodes = Array.from(el.childNodes).filter(
      (node) => node.nodeType === 3
    );
  
    textNodes.forEach((node) => {
      nodesMap.set(node, node.nodeValue);
    });
  
    const evaluate = () => {
      try {
        
        textNodes.forEach((textNode) => {
          const originalValue = nodesMap.get(textNode);
          const regex = /@html\((.*?)\)/g;
          let match;
          let hasHtml = false;
          const fragments = [];
  
          let lastIndex = 0;
  
          while ((match = regex.exec(originalValue))) {
            const before = originalValue.slice(lastIndex, match.index);
            if (before) fragments.push(document.createTextNode(before));
  
            let expression = match[1];
            let htmlString = '';
            
            
            try {
              
              htmlString = evaluateExpr(expression,context,`from text interpolation @html() - ${expression}`)
            } catch (e) {
              htmlString = `<span style="color:red;">[Invalid Expression]</span>`;
            }
  
            const temp = document.createElement('div');
            temp.innerHTML = htmlString;
            fragments.push(...temp.childNodes);
            hasHtml = true;
  
            lastIndex = regex.lastIndex;
          }
  
          const after = originalValue.slice(lastIndex);
          if (after) fragments.push(document.createTextNode(after));
  
          if (hasHtml) {
            const parent = textNode.parentNode;
            parent.insertBefore(document.createDocumentFragment(), textNode);
            fragments.forEach((frag) => parent.insertBefore(frag, textNode));
            parent.removeChild(textNode);
          }
        });
      } catch (error) {
        console.warn(`Error while evaluating innerHTML for`, el, error);
      }
    };
  
    // Helper to resolve nested properties
    const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };
  
    evaluate();
  };
  

/**
 * 
 * @param {PawaElement | HTMLElement} el 
 * @param {object} contexts 
 */
const render =async (el, contexts = {}) => {
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
    if(!el.hasAttribute('s-pawa-avoid')){
      innerHtml(el,context)
    }
    PawaElement.Element(el,context)
    
     if(el.childNodes.some(node=>node.nodeType === 3 && node.nodeValue.includes('@{')) && !el._avoidPawaRender){
        textContentHandler(el)  
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
      
      el.attributes.forEach(async(attr)=>{
          if (directives[attr.name]) {
              await directives[attr.name](el,attr)  
          }else if(attr.value.includes('@{')){
              attributeHandler(el,attr)
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
          
      })
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
  for (const child of children) {
    await render(child, el._context);
  }
}

    el._setError()
}
exports.render=render
const { If,Else,ElseIf,For,State } = require('./power.js');
const directives={
    'if':If,
    'else':Else,
    'else-if':ElseIf,
    'for':For,
    'state-':State
}

const setApp=()=>{

}
exports.startApp = async (html, context = {}, devlopment = false) => {
  const appContext = {
    context: context,
    stateContext: null,
  };
  isDevelopment = devlopment;
  const app = new DOMParser();
  const { document } = parseHTML();
  const body = app.parseFromString(html, 'text/html');
  const div = body.firstElementChild; // Original app div
  const root = document.createElement('div'); // New root to track transformations
  root.appendChild(div.cloneNode(true)); // Clone to preserve original structure

  await store.run(appContext, async () => {
    await render(root.firstElementChild, context); // Render into cloned div
  });

  // Ensure all async rendering is complete
  await new Promise((resolve) => setTimeout(resolve, 0)); // Microtask queue flush

  return {
    element: root?.firstElementChild, // Return the transformed element
    toString: async () => root?.firstElementChild?.outerHTML, // Reflect transformed HTML
  };
};
