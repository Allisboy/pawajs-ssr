const {render} = require("./index.js");
const { convertToNumber,evaluateExpr, processNode } = require("./utils.js");
const {parseHTML} = require("linkedom")
exports.If = async(el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  if (nextSibling && (nextSibling.getAttribute('else') !== null || nextSibling.getAttribute('else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const result = evaluateExpr(attr.value, el._context,`at if directives check - ${attr.value}`);
  const newElement = el.cloneNode(true);
  newElement.removeAttribute(attr.name)
  const {document}=parseHTML()
  const id=crypto.randomUUID()
  const comment=document.createComment(`if(${attr.value})-${id}`)
  const endComment=document.createComment(`end if(${attr.value})-${id}`)
  el.replaceWith(endComment);
  if (result) {
    endComment.parentElement.insertBefore(comment,endComment)
    newElement.setAttribute('resume-if',id)
    comment.parentElement.insertBefore(newElement,comment)
    await render(newElement, el._context);
  } else {
    const template=document.createElement('template')
    template.setAttribute('pawa-render',true)
    template.appendChild(el)
    endComment.replaceWith(template);
  }
};

exports.Else =async (el, attr) => {
  if (el._running) return;
  el._running = true;

  const value = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');
  const result = evaluateExpr(value, el._context,`at else directives performing previous condition check - ${value}`);
  const {document}=parseHTML()
  const id=crypto.randomUUID()
  const comment=document.createComment(`else(${value})-${id}`)
  const endComment=document.createComment(`end else(${value})-${id}`)
  el.replaceWith(endComment);
  if (result) {
    const template=document.createElement('template')
    template.appendChild(el)
    template.setAttribute('pawa-render',true)
    endComment.replaceWith(template);
  } else {
    const newElement = el.cloneNode(true);
    newElement.setAttribute('resume-else',id)
    newElement.removeAttribute('else');
    endComment.parentElement.insertBefore(comment,endComment)
    comment.parentElement.insertBefore(newElement,endComment)
    await render(newElement, el._context);
  }
};

exports.ElseIf = async(el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  const prevCondition = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');

  if (nextSibling && (nextSibling.getAttribute('else') !== null || nextSibling.getAttribute('else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const prevResult = evaluateExpr(prevCondition, el._context,`at else-if directives performing if evaluation check - ${prevCondition}`);
  const currentResult = evaluateExpr(attr.value, el._context,`at else-if directives check - ${attr.value}`);
  const {document}=parseHTML()
  const id=crypto.randomUUID()
  const comment=document.createComment(`elseif(${attr.value})-${id}`)
  const endComment=document.createComment(`end elseif(${attr.value})-${id}`)
  el.replaceWith(endComment);
  if (prevResult) {
    const template=document.createElement('template')
    template.appendChild(el)
    template.setAttribute('pawa-render',true)
    endComment.replaceWith(template);
  } else if (currentResult) {
    const newElement = el.cloneNode(true);
    newElement.setAttribute('resume-elseif',id)
    endComment.parentElement.insertBefore(comment,endComment)
    comment.parentElement.insertBefore(newElement,comment)
    await render(newElement, el._context);
  } else {
    const template=document.createElement('template')
    template.appendChild(el)
    template.setAttribute('pawa-render',true)
    endComment.replaceWith(template);
  }
};

exports.For=async(el,attr)=>{
    if(el._running){
      return
    }
    el._running=true
    try {
      const value=attr.value
    const {document}=parseHTML()
    const dirId=crypto.randomUUID()
    const comment=document.createComment(`for(${attr,value})-${dirId}`)
    const endComment=document.createComment(`endfor(${attr,value})-${dirId}`)
    const commentElement=document.createComment(`${el.outerHTML}`)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    endComment.parentElement.insertBefore(commentElement,endComment)
    const split=value.split(' in ')
    const arrayName=split[1]
    const arrayItems=split[0].split(',')
    const arrayItem=arrayItems[0]
    const indexes=arrayItems[1]
    const array=evaluateExpr(arrayName,el._context,`at s-for directives check - ${attr.value}`)
    if(Array.isArray(array)){
      if (array.length > 0) {
        array.forEach(async (item,index)=>{
          const context=el._context
          const itemContext = {
            [indexes]: index,
            ...context
          }
          
          itemContext[arrayItem]=item
          const newElement=el.cloneNode(true)
          newElement.setAttribute('resume-for',dirId)
          newElement.removeAttribute('for')
          processNode(newElement,itemContext)
          if (newElement.hasAttribute('for-key')) {
            const key=newElement.getAttribute('for-key')
            const keyId=crypto.randomUUID()
            const keyComment=document.createComment(`forKey-${key}-${keyId}`)
            const endKeyComment=document.createComment(`endForKey-${key}-${keyId}`)
            endComment.parentElement.insertBefore(endKeyComment,endComment)
            endKeyComment.parentElement.insertBefore(keyComment,endKeyComment)
            endKeyComment.parentElement.insertBefore(newElement,endKeyComment)
          }else{
            el.parentElement.insertBefore(newElement,el)
            await render(newElement,itemContext)
          }
        })
      }else{
        const template=document.createElement('template')
        template.setAttribute('pawa-render',true)
        template.appendChild(el)
        comment.replaceWith(template)
        endComment.remove()
      }
    }
    
    } catch (error) {
      console.error(error.message,error.stack)
    }
}

exports.State=async(el,attr)=>{
  if (el._running) {
    return
  }
  try {

    const result=evaluateExpr(attr.value,el._context,`at state directive ${attr.name}=${attr.value}`)
    const name=attr.name.split('-')[1]
    el.setAttribute('resume-state',attr.value)
    el._context[name]={value:result}
    
  } catch (error) {
    console.log(error.message,error.stack)
  }
}