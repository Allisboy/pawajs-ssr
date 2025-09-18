const { DOMParser,parseHTML, HTMLElement} =require('linkedom')
const PawaComponent = require('./pawaComponent.js')
const { sanitizeTemplate,propsValidator, evaluateExpr } = require('./utils.js');

/**
 * @type{null|{_formerContext:stateContext,_hasRun:boolean,_prop:object,_name:string,_insert:object,_transportContext}}
 */ 

const components = new Map();
exports.getPawaComponentsMap =()=>{
  return components ;
}

let isDevelopment
const getDevelopment=()=>isDevelopment
exports.getDevelopment=getDevelopment
const $state = (arg) => {
    return {
        value: arg
    };
};
exports.$state=$state
// under consideration
 
/**
 * @type{string}
 */
const allServerAttr=['s-if','s-else','s-else-if','s-for','s-key'];
const getAllServerAttrArray=()=>{
  return allServerAttr;
}
exports.getAllServerAttrArray=getAllServerAttrArray
const RegisterComponent = function (...args) {
  // Handle new signature from plugin: RegisterComponent('Name1', Func1, 'Name2', Func2, ...)
  if (typeof args[0] === 'string') {
    for (let i = 0; i < args.length; i += 2) {
      const name = args[i];
      const component = args[i + 1];
      if (typeof name === 'string' && typeof component === 'function') {
        if (components.has(name.toUpperCase())) continue;
        components.set(name.toUpperCase(), component);
      } else {
        console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string, function).');
        break;
      }
    }
    return;
  }

  // Handle old signature for dev mode: RegisterComponent(ComponentFunc1, ComponentFunc2, ...)
  args.forEach((component) => {
    if (typeof component === 'function' && component.name) {
      if (components.has(component.name.toUpperCase())) return;
      components.set(component.name.toUpperCase(), component);
    } else {
       console.warn('Component registration failed: Component must be a named function. This might happen in production builds without the pawajs Vite plugin.');
    }
  });
}; 
exports.RegisterComponent=RegisterComponent
const compoBeforeCall = new Set()
const compoAfterCall=new Set()
const renderBeforePawa=new Set()
const renderAfterPawa=new Set()
const renderBeforeChild=new Set()
const startsWithSet=new Set()
const fullNamePlugin=new Set()
const externalPlugin={}
let pawaAttributes=new Set()

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
exports.PluginSystem=(...func)=>{
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
const PawaElement = require('./pawaElement.js')

/**
 * 
 * @param {import('./pawaElement.js').default|
 * @returns 
 */
const component=(el)=>{
    if(el._running){
        return
    }
   try {
    const slot=el._slots
    const slots={}
    let stateContext=null
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        slots[prop.getAttribute('prop')]=prop.innerHTML
      }else{
        console.warn('sloting props must have prop attribute')
      }
    }) 
    const children=el._componentChildren
    /**
     * @type{import('./pawaComponent.js').default}
     */
    const component =el._component
    stateContext=component
    const insert=(arg={})=>{
            Object.assign(stateContext._insert,arg)
    }
    /**
 * 
 * @param {object} props 
 * @returns {object}
 */
stateContext._prop={children,...el._props,...slots}
stateContext._name=el._componentName
 const useValidateProps=(props={}) => {
  if (!stateContext) {
    console.warn('must be used inside of a component')
    return
  }
    
    return propsValidator(props,stateContext._prop,stateContext._name)
}
    const app = {
        children,
        app:{
          insert,
          useValidateProps,
          useInnerContext:()=>el._context
        },
        ...slots,
        ...el._props
      }
      for (const fn of compoBeforeCall) {
            try {
              fn(stateContext,app)
            } catch (error) {
              console.error(error.message,error.stack)
            }
          } 
      const {document}=parseHTML()
    const comment=document.createComment('componet')
    el.replaceWith(comment)
    const div=document.createElement('div')
    let compo 
    try{
      compo=component.component(app)
    }catch(error){
      console.error(`error from ${stateContext._name}`,error.message,error.stack)
    }
    if (component?._insert) {
        Object.assign(el._context,component._insert)
      }

      div.innerHTML=compo
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
            fn(stateContext,div?.firstElementChild,el)
          } catch (error) {
            console.error(error.message,error.stack)
          }
        }
        const newElement=div.firstElementChild
      if (newElement) {
        comment.replaceWith(newElement)
        render(newElement,el._context)
      }
        comment.remove()
         } catch (error) {
    console.log(error.message,error.stack);
    
   }
}
const textContentHandler=(el)=>{
    if (el._running) {
        return
      }
      const nodesMap = new Map();
      const curentHtmlString=el.outerHTML
      // Get all text nodes and store their original content
      const textNodes = el.childNodes.filter(node => node.nodeType === 3);
      textNodes.forEach(node => {
        nodesMap.set(node, node.nodeValue);
      });
      const evaluate = () => {
        try {
          textNodes.forEach(textNode => {
            // Always use original content from map for evaluation
            let value = nodesMap.get(textNode);
            const regex = /@\((.*?)\)/g;
            
            value = value.replace(regex, (match, expression) => {
                const func = evaluateExpr(expression,el._context,`from text interpolation @() - ${expression} at ${curentHtmlString}`)
                return String(func);
              });            
            textNode.nodeValue = value;
            
            
          });
        } catch (error) {
          console.warn(`error at ${el._template} textcontent`)
          console.error(error.message,error.stack)
        }
      };
      evaluate()
}
const attributeHandler=(el,attr)=>{
    if (el._hasForOrIf()) {
        return
      }
      if(el._running){
        return
      }
      const curentHtmlString=el.outerHTML
      const removableAttributes=new Set()
      removableAttributes.add('disabled')
      const evaluate=()=>{
          try {
            const regex =  /@\((.*?)\)/g;

            let value = attr.value;
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        
        value = value.replace(regex, (match, expression) => {
          return evaluateExpr(expression,el._context,`from text interpolation @() - ${expression} at ${curentHtmlString} attribute ${attr.name}`)
        });
        
        if (removableAttributes.has(attr.name)) {
            if (value) {
              el.setAttribute(attr.name, '');
            } else {
              el.removeAttribute(attr.name)
            }
          } else {
            el.setAttribute(attr.name, value);
          }
        } catch (error) {
            console.log(error.message,error.stack)
        }
      }
      evaluate()
}
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
const render = (el, contexts = {}) => {
    const context={
        ...contexts
    }
    for (const fn of renderBeforePawa) {
      try {
        fn(el,context)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
    if(!el.hasAttribute('s-pawa-avoid')){
      innerHtml(el,context)
    }
    PawaElement.Element(el,context)
    
     if(el.childNodes.some(node=>node.nodeType === 3 && node.nodeValue.includes('@(')) && !el._avoidPawaRender){
        textContentHandler(el)  
     }
     let startAttribute=false
   const startObject={}
   //get startsWith plugin
   if (!el._avoidPawaRender) {
    startsWithSet.forEach( starts=>{
    
    el._attributes.forEach(attr =>{
      if(attr.name.startsWith('on:')){
        startAttribute=true
        startObject[attr.name]=starts
      }
    })
   })
   }
     for (const fn of renderAfterPawa) {
      try {
        fn(el)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
    if (!el._avoidPawaRender) {
      
      el.attributes.forEach(attr=>{
          if (directives[attr.name]) {
              directives[attr.name](el,attr)  
          }else if(attr.value.includes('@(')){
              attributeHandler(el,attr)
          }else if(fullNamePlugin.has(attr.name)) {
          if(externalPlugin[attr.name]){
            const plugin= externalPlugin[attr.name]
            try{
              if (typeof plugin !== 'function') {
                console.warn(`${attr.name} plugin must be a function`)
                return
              }
              plugin(el,attr)
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
              plugin(el,attr)
            }catch(error){
              console.warn(error.message,error.stack)
            }
          }
        }
          
      })
      if (el._componentName) {
          component(el)
          return
      }
    }
    for (const fn of renderBeforeChild) {
      try {
        fn(el)
      } catch (error) {
        console.error(error.message,error.stack)
      }
    }
    if(!el._running){
        Array.from(el.children).forEach(child=>{
            render(child,el._context)
        })
    }
    el._setError()
}
exports.render=render
const { If,Else,ElseIf,For } = require('./power.js');
const directives={
    's-if':If,
    's-else':Else,
    's-else-if':ElseIf,
    's-for':For
}
exports.startApp = (html, context = {},devlopment=false) => {
isDevelopment=devlopment
    const app=new DOMParser()
    const {document}=parseHTML()
   const body= app.parseFromString(html,'text/html')
   const div=body.firstElementChild
    const element=document.createElement('div')
    element.appendChild(div)
    render(div,context);
    
    
    return {
      element:div,
      toString:()=>div.outerHTML
    }
}
