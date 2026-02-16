import {render} from "./index.js";
import { convertToNumber,evaluateExpr, processNode, reArrangeAttri, pawaGenerateId }  from "./utils.js";
import {parseHTML}  from "linkedom"
export const If = async(el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSiblings = el.nextElementSibling || null;
   const chained=[{
        exp:el.getAttribute('if'),
        condition:'if',
        element:el
    }]
    const chainMap=new Map()
    chainMap.set(el.getAttribute('if'),{condition:'if',element:el})
     const getChained=(nextSibling)=>{
         if (nextSibling !== null) {
             if (nextSibling && nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {
                 if (nextSibling.getAttribute('else-if')) {
                     chained.push({
                         exp:nextSibling.getAttribute('else-if'),
                         condition:'else-if',
                         element:nextSibling
                     })
                     chainMap.set(nextSibling.getAttribute('else-if'),{condition:'else-if',element:nextSibling})
                     getChained(nextSibling.nextElementSibling)
                     nextSibling.remove()
                 }else if (nextSibling.getAttribute('else') === '') {
                     chained.push({
                         exp:'false',
                         condition:'else',
                         element:nextSibling
                     })
                     chainMap.set('else',{condition:'else',element:nextSibling})
                     nextSibling.remove()
                 }
             }
         }
     }
     getChained(nextSiblings)
let func=new Map()
let current
let latestChain
  chained.forEach((item)=>{
       if(item.condition === 'else' || current)return
       const result = evaluateExpr(item.exp, el._context,`at condition  directives check - ${item.exp}`);
       current=result
       if (current) {
            latestChain={
                id:item.exp,
                condition:item.condition
            }
         }else{
             latestChain={
                 id:'else',
                 condition:'else'
             }
         }
       
   })
  const document=el.ownerDocument
  const id=pawaGenerateId(10)
  const comment=document.createComment(`condition(${latestChain.id})@-$@-$@${id}`)
  const endComment=document.createComment(`end condition(${latestChain.id})@-$@-$@${id}`)
  el.replaceWith(endComment);
  let stringHtml=''
  const template=document.createElement('template')
  const store=document.createElement('template')
  chained.forEach((item,index) =>{
    const clone=item.element.cloneNode(true)
    if (index === 0) {
        Array.from(clone.attributes).forEach(at => {
        if (at.name.startsWith('c-')) {
          clone.removeAttribute(at.name)
          clone.removeAttribute('p:c')
        }
      });
      // stringHtml+=clone.outerHTML
      store.appendChild(clone)
    }else{
      store.appendChild(clone)
    }
      template.appendChild(item.element)
      
    })
  const getRightElement=chainMap.get(latestChain.id)
  if (getRightElement) {
    const copyElement=getRightElement.element.cloneNode(true)
    copyElement.attributes.forEach((att)=>{
      if(att.name.startsWith('c-')){
        copyElement.removeAttribute(att.name)
      }
    })
    const dataComment=document.createComment(stringHtml)
    let newElement = el.cloneNode(true);
    if (attr.value === latestChain.id) {
      el._replaceResumeAttr('if',`c-if-${id}`,latestChain.id)
      newElement = el.cloneNode(true);
    }else{
      el._replaceResumeAttr('if',`c-if-${id}`,latestChain.id,copyElement)
      newElement = copyElement;
    }
    newElement.removeAttribute(latestChain.condition)
    newElement.setAttribute('pawa-same',true)
    endComment.parentElement.insertBefore(comment,endComment)
    store.setAttribute('p:store-if',id)
    store.setAttribute('p:store','')
    comment.parentElement.insertBefore(store,endComment)
    comment.parentElement.insertBefore(newElement,endComment)
    await render(newElement, el._context);
  } else {
    
    template.setAttribute('pawa-render',true)
    endComment.replaceWith(template);
  }
};
export const Switch = async(el, attr) => {
  if (el._running) return;
  el._running = true;
try {
  
  const nextSiblings = el.nextElementSibling || null;
  const cases =el.getAttribute('case')
  const chained=[{
        exp:el.getAttribute('case'),
        condition:'case',
        element:el
    }]
    const chainMap=new Map()
    chainMap.set(el.getAttribute('case'),{condition:'case',element:el})
     const getChained=(nextSibling)=>{
         if (nextSibling !== null) {
             if (nextSibling && nextSibling.getAttribute('default') === '' || nextSibling.getAttribute('case')) {
                 if (nextSibling.getAttribute('case')) {
                     chained.push({
                         exp:nextSibling.getAttribute('case'),
                         condition:'case',
                         element:nextSibling
                     })
                     chainMap.set(nextSibling.getAttribute('case'),{condition:'case',element:nextSibling})
                     getChained(nextSibling.nextElementSibling)
                     nextSibling.remove()
                 }else if (nextSibling.getAttribute('default') === '') {
                     chained.push({
                         exp:'false',
                         condition:'default',
                         element:nextSibling
                     })
                     chainMap.set('default',{condition:'default',element:nextSibling})
                     nextSibling.remove()
                 }
             }
         }
     }
     getChained(nextSiblings)
let func=new Map()
let current
let latestChain
const switchFunc=evaluateExpr(attr.value,el._context,`at switch directive ${attr.value}`)
  chained.forEach((item)=>{
       if(item.condition === 'default' || current)return
       const result = switchFunc === evaluateExpr(item.exp, el._context,`at condition  directives check - ${item.exp}`);
       current=result
       if (current || item.condition === 'default') {
            latestChain={
                id:item.exp,
                condition:item.condition
            }
         }else{
           latestChain={
             id:'default',
             condition:'default'
             }
         }
       
        })
        const document=el.ownerDocument
        const id=pawaGenerateId(10)
        const comment=document.createComment(`switch case (${latestChain.id})@-$@-$@${id}`)
        const endComment=document.createComment(`end switch(${latestChain.id})@-$@-$@${id}`)
        el.replaceWith(endComment);
        let stringHtml='' 
        const template=document.createElement('template')
        const store=document.createElement('template')
        let index=0
        chained.forEach(item =>{
          const clone=item.element.cloneNode(true)
          if (index === 0) {
        Array.from(clone.attributes).forEach(at => {
        if (at.name.startsWith('c-')) {
          clone.removeAttribute(at.name)
        }
      });

      store.appendChild(clone)
      }else{
      store.appendChild(clone)
      } 
      index++
      template.appendChild(item.element)
        })
        el.removeAttribute('switch')
  const getRightElement=chainMap.get(latestChain.id)
  if (getRightElement && (current || latestChain.condition === 'default')) {
    const copyElement=getRightElement.element.cloneNode(true)
    copyElement.attributes.forEach((att)=>{
      if(att.name.startsWith('c-')){
        copyElement.removeAttribute(att.name)
      }
    })
    let newElement = el.cloneNode(true);
    if (cases === latestChain.id) {
      el._replaceResumeAttr(latestChain.condition,`c-sw-${id}`,latestChain.id)
       newElement = el.cloneNode(true);
      }else{
        el._replaceResumeAttr(latestChain.condition,`c-sw-${id}`,latestChain.id,copyElement)
        newElement = copyElement;
      }
      newElement.removeAttribute(latestChain.condition)
      newElement.setAttribute('pawa-same',true)
      store.setAttribute('p:store-switch',id)
      store.setAttribute('p:store','')
      endComment.parentElement.insertBefore(comment,endComment)
      comment.parentElement.insertBefore(template,endComment)
    comment.parentElement.insertBefore(newElement,endComment)
    await render(newElement, el._context);
  } else {
    // If no case matches and no default, we just leave the comments
    template.setAttribute('pawa-render',true)
    endComment.parentElement.insertBefore(comment, endComment);
    comment.parentElement.insertBefore(template, endComment);
    // No element rendered
  }
} catch (error) {
  console.log(error.message,error.stack,`at switch directive ${el._template}`)
}
};

export const For=async(el,attr)=>{
    if(el._running){
      return
    }
    el._running=true
    try {
    const value=attr.value
    const document=el.ownerDocument
    const dirId=pawaGenerateId(10)
    const comment=document.createComment(`for(${value})@-$@-$@${dirId}`)
    const endComment=document.createComment(`endfor(${value})@-$@-$@${dirId}`)
    el.replaceWith(endComment)
    const hasKey=el.getAttribute('for-key')
    endComment.parentElement.insertBefore(comment,endComment)
    
    // More robust split using regex to find the last occurrence of ' in ' or handle simple cases
    const match = value.match(/^(.*?) in (.*)$/);
    if (!match) throw new Error(`Invalid for loop syntax: ${value}`);
    const [_, itemPart, arrayName] = match;
    const arrayItems=itemPart.split(',')
    const arrayItem=arrayItems[0].trim()
    const indexes=arrayItems[1]
    const array=evaluateExpr(arrayName,el._context,`at for directives check - ${attr.value}`)
    const copyElement=el.cloneNode(true)
    const store=[]
    Array.from(copyElement.attributes).forEach(at=>{
      if (at.name.startsWith('c-')) {
        store.push(at)
        copyElement.removeAttribute(at.name)
      }
    })
    
    const template=document.createElement('template')
    template.appendChild(copyElement.cloneNode(true))
    store.forEach(at=>{
      copyElement.setAttribute(at.name,at.value)
    })
    const componentAttr={}
    if(Array.isArray(array)){
      if (array.length > 0) {
        template.setAttribute('p:store-for',dirId)
        template.setAttribute('p:store','')
        endComment.parentElement.insertBefore(template,endComment)
        el.attributes.forEach(attri =>{
          if(attri.name.startsWith('c-')){
            componentAttr[attri.name]=attri.value
          }
        })
        el._replaceResumeAttr('for-each',`c-for`,dirId)
        el.removeAttribute('for-each') 
        
        // Fix: Use for...of to ensure await works correctly in SSR
        for (const [index, item] of array.entries()) {
          const context=el._context
          const itemContext = {
            [arrayItem]: item,
            [indexes]: index,
            ...context
          }
          itemContext[arrayItem]=item
          const newElement=el.cloneNode(true)
          if(index !== 0){
            newElement.removeAttribute('c-for')
            for (const [key,value] of Object.entries(componentAttr)) {
              if(newElement.hasAttribute(key)){ //removing element with resuming attri from second -- for element
                newElement.removeAttribute(key)
              }
            }
          }
          newElement.setAttribute('pawa-same',true)
          processNode(newElement,itemContext)
          
            const key=newElement.getAttribute('for-key')
            const keyComment=document.createComment(`forKey@-$@-$@${dirId}@-$@-$@${key || index}`)
            const endKeyComment=document.createComment(`endForKey@-$@-$@${dirId}@-$@-$@${key  || index}`)
            endComment.parentElement.insertBefore(endKeyComment,endComment)
            endKeyComment.parentElement.insertBefore(keyComment,endKeyComment)
            endKeyComment.parentElement.insertBefore(newElement,endKeyComment)
            await render(newElement,itemContext)
        }

      }else{
        template.setAttribute('pawa-render',true)
        template.appendChild(el)
        comment.replaceWith(template)
        endComment.remove()
      }
    }
    
    } catch (error) {
      console.error(error.message,error.stack,`at for directive ${el._template}`)
    }
}

export const State=async(el,attr)=>{
  if (el._running) {
    return
  }
  try {

    const result=evaluateExpr(attr.value,el._context,`at state directive ${attr.name}=${attr.value}`)
    const name=attr.name.split('-')[1]
    el._replaceResumeAttr(attr.name,`c-$-${name}`,attr.value)
    // el.setAttribute(`resume-state-${name}`,attr.value)
    el._context[name]={value:result}
    el.removeAttribute(attr.name)
  } catch (error) {
    console.log(error.message,error.stack,`at ${el._template} from state`)
  }
  
}

export const Key=async(el,attr)=>{
  if(el._running){
      return
    }
    el._running=true
    try {
    const value=attr.value
    const document=el.ownerDocument
    const dirId=pawaGenerateId(10)
    const comment=document.createComment(`key`)
    const endComment=document.createComment(`key`)
    const clone=el.cloneNode(true)
    const template=document.createElement('template')
    template.setAttribute('p:store-key',dirId)
    template.setAttribute('p:store','')
    clone.attributes.forEach(at => {
      if (at.name.startsWith('c-')) {
        clone.removeAttribute(at.name)
      }
    });
    template.appendChild(clone)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    const func=evaluateExpr(attr.value,el._context,`error at Key - ${attr.name} = ${attr.value}`,el)
    endComment.parentElement.insertBefore(template,endComment)
    comment.data=`key(${func})@-$@-$@${dirId}`
    endComment.data=`key(${func})@-$@-$@${dirId}`
    el._replaceResumeAttr('key',`c-key-${dirId}`,typeof func === 'string'?`'${func}'`:func)
    el.removeAttribute(attr.name)
    const newElement=el.cloneNode(true)
     endComment.parentElement.insertBefore(newElement,endComment)
     await render(newElement,el._context)
}catch(error){
  console.error(error.message,error.stack,`at key ${el._template}`)
}
}