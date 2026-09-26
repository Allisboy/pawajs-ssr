import { safeEval, splitAndAdd } from "pawajs/src/utils.js";
import { primaryAttribute } from "pawajs/src/store.js";
import { isProxy } from "../utils.js";

export const checkIfClient=(graph,compo)=>{
  let isClient=false
  if (compo?.client) {
    isClient=true
  }else if(graph?.runEffect || graph?.state || graph?.useRef || graph?.isClient || graph?.setContext){
    isClient=true
  }
  return {isClient}
}
/**
 * @param {HTMLElement} el
 */
export const initaiteComponent = (el,context) => {
  try {
    const {slot,stringProp}=getPropsAndSlot(el)
    const {restProps,prop,aschild,isClient,passerProps}=getPropFromAttributes(el,context)
    return {
        slot,
        stringProp,
        restProps,
        prop,
        aschild,
        isClient,
        passerProps
    }
  } catch (error) {
    console.log(error);
    
    throw {
      ...error,
      effect: "setting props",
      ref: el,
    };
  }
};

/**
 * @param {HTMLElement} el
 */
const getPropsAndSlot = (el) => {
  const stringProp = {};
  const slot = { default: [] };
  Array.from(el.childNodes).forEach((s) => {
    if (s.tagName === "TEMPLATE" && s.hasAttribute("prop")) {
      const prop = s.getAttribute("prop");
      stringProp[prop] = s.innerHTML;
    } else if (s.tagName === "TEMPLATE" && s.hasAttribute("slot")) {
      const prop = s.getAttribute("slot");
      slot[prop] = s.content.children;
    } else {
      slot.default.push(s)
    }
  });
  return { stringProp, slot };
};
/**
 * @param {HTMLElement} el
 */
const getPropFromAttributes = (el,context) => {
  const attributes = Array.from(el.attributes);
  const prop = {};
  const restProps = {};
  const passerProps={}
  let aschild=false
  let clients=false
  if (el.tagName === 'D-TEXT') {
    // console.log(el.outerHTML);
    
  }
  for (const attr of attributes) {
    if (splitAndAdd(attr.name).toLowerCase() === 'aschild') {
        aschild=true
        continue
    }
    if (attr.name === 'p:id') {
      continue
    }
    if(attr.name === 'force'){
      clients=true
      continue
    }
      if (!primaryAttribute.has(attr.name)) {
      if (
        attr.name.startsWith("-") ||
        attr.name.startsWith("@") ||
        attr.value.startsWith("on-")
      ) {

        restProps[attr.name] = attr.value;
        passerProps[attr.name]=attr.value
      } else if (!attr.name.startsWith(':')) {
        
        restProps[attr.name]=attr.value
        
        const toProp = () => {
          let value = attr.value;
          if (attr.value.includes('@{')) {
            
            const regex = /@{([^}]*)}/g;
            value = value.replace(regex, (match, expression) => {
              try {
                const  result=safeEval(expression, context, true)
                
                 return result
                } catch (error) {
                  console.log(`[${attr.name}]:[${attr.value}] at Prop`,error,el.outerHTML);
                  throw {
                    msg:error.message,
                    effect:el.tagName,
                    ref:el.outerHTML,
                    exp:`[${attr.name}]:[${attr.value}] at Prop`
                  }
                }
              });
              return value
            }else{
            return value
          }
          }
      let name=attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          
        if (!prop[name]) {
          if(name === 'class')prop['className']=toProp
          else if(name === 'default')prop['defaultValue']=toProp
          else if (name !== 'class' && name !== 'default' ) {
              prop[name]=toProp
            }
          }
      }else if(attr.name.startsWith(':')){
        const propsName=attr.name.slice(1) 
        
        restProps[attr.name]=attr.value
        if(attr.value === '') attr.value="true";
        try {
            const {result:value,client}=isProxy(()=>{
              return safeEval(`()=>{
                const prop=${attr.value}
                return prop
            }
                `,context,true)
            })
            if (!clients) {
              clients=client
            }
                if (value) {
          let name=propsName
                if(name.includes('-')){
                     name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                }
                
          prop[name]=value
          
        }
        } catch (error) {
            console.log(`[${attr.name}]:[${attr.value}] at Prop`,error,el.outerHTML);
            throw {
                msg:el.outerHMTL,
                effect:el.tagName,
                ref:el.outerHTML,
                exp:`[${attr.name}]:[${attr.value}] at Prop`
            }
        }
      }
    }
  }
  return {prop,restProps,aschild:aschild,isClient:clients,passerProps}
};

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} div
 * @param {boolean} aschild
 * @param {Document} doc
 */

export const renderAschild=(div,aschild,child)=>{
    const fromDiv=div.firstElementChild
    fromDiv.remove()
 let  divs =child.filter(c=>c.nodeType === 1 )[0]
    const createChild=divs
    let main=aschild?createChild:fromDiv.tagName === 'SLOT'?createChild:fromDiv
    if( aschild || fromDiv.tagName === 'SLOT' && main.nodeType === 1){
      
        Array.from(fromDiv.attributes).forEach(attr => {
          const attrName = attr.name.replace(/^-+/, '').trim()
          if (!main.hasAttribute(attr.name)) {
            main.setAttribute(attr.name, attr.value)
            return
          }
    
          if (attrName === 'class') {
            const existing = main.getAttribute(attr.name)
            main.setAttribute(attr.name, `${attr.value} ${existing}`.trim())
          } else if (attrName === 'style') {
            const existing = main.getAttribute(attr.name)
            main.setAttribute(attr.name, `${attr.value};${existing}`.replace(/;+/g, ';'))
          } else {
            let name = attr.name
            while (main.hasAttribute(name)) name = `-${name}`
            main.setAttribute(name, attr.value)
          }
        })
        
    }
    return {element:main,asChild: aschild || fromDiv.tagName === 'SLOT'}
}
/**
 * @param {HTMLElement} el
 * @param {{[key]:Array<HTMLElement>,default:Array<HTMLElement>}} slot
 */
export const setSlot=(el,slot)=>{
    //find slot by key
    for (const [key,value] of Object.entries(slot)) {
        if(key){
        const seen=el.querySelector(`slot[name="${key}"]`) 
        if (seen) {
            for (const child of Array.from(value)) {
                const parent=seen.parentElement
                parent.insertBefore(child,seen)
            }
            if (value.length === 0 && seen.children.length > 0) {
                for (const child of Array.from(seen.children)) {
                    const parent=seen.parentElement
                    parent.insertBefore(child,seen)
                }
            }
            seen.remove()
        }
        }
    }

    const getAllslot=el.querySelectorAll('slot')
    
    for (const element of Array.from(getAllslot)) {
        if (element.attributes.length > 0 && element.getAttribute('name') !== 'default') {
            for (const child of Array.from(element.children)) {
                    const parent=element.parentElement
                    parent.insertBefore(child,element)
                }
                element.remove()
        }
    }
    
    if (slot.default) {
        const seen=el.querySelector(`slot[name="default"]`) || el.querySelector('slot')   
        if (seen) {
            for (const child of Array.from(slot.default)) {
               const parent=seen.parentElement
                parent.insertBefore(child,seen)
            }
            if (slot.default.length === 0 && seen.children.length > 0) {
                for (const child of Array.from(seen.children)) {
                   const parent=seen.parentElement
                    parent.insertBefore(child,seen)
                }
            }
            seen.remove()
        }
        }
}