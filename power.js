import { render } from "./index.js";
import { convertToNumber,evaluateExpr } from "./utils.js";



export const If = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  if (nextSibling && (nextSibling.getAttribute('server-else') !== null || nextSibling.getAttribute('server-else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const result = evaluateExpr(attr.value, el._context);
  if (result) {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('server-if');
    newElement.setAttribute('s-data-if', convertToNumber(attr.value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  } else {
    el.remove();
  }
};

export const Else = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const value = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');
  const result = evaluateExpr(value, el._context);
  if (result) {
    el.remove();
  } else {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('server-else');
    newElement.setAttribute('s-data-else',convertToNumber(value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  }
};

export const ElseIf = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  const prevCondition = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');

  if (nextSibling && (nextSibling.getAttribute('server-else') !== null || nextSibling.getAttribute('server-else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const prevResult = evaluateExpr(prevCondition, el._context);
  const currentResult = evaluateExpr(attr.value, el._context);

  if (prevResult) {
    el.remove();
  } else if (currentResult) {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('server-else-if');
    newElement.setAttribute('s-data-else-if', convertToNumber(attr.value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  } else {
    el.remove();
  }
};

export const For=(el,attr)=>{
    if(el._running){
      return
    }
    el._running=true
    try {
      const value=attr.value
    const split=value.split(' in ')
    const arrayName=split[1]
    const arrayItems=split[0].split(',')
    const arrayItem=arrayItems[0]
    const indexes=arrayItems[1]
    const array=evaluateExpr(arrayName,el._context)
    if(Array.isArray(array)){
      array.forEach((item,index)=>{
        const context=el._context
        const itemContext = {
          [indexes]: index,
          ...context
        }
        itemContext[arrayItem]=item
        const newElement=el.cloneNode(true)
        newElement.removeAttribute('server-for')
        newElement.setAttribute('s-data-for',convertToNumber(attr.value))
        
        el.parentElement.insertBefore(newElement,el)
        render(newElement,itemContext)
        if (newElement.getAttribute('server-key')) {
          newElement.setAttribute('s-data-loop-key',convertToNumber(newElement.getAttribute('server-key')))
          newElement.removeAttribute('server-key')
        }
      })
    }
    el.remove()
    } catch (error) {
      console.error(error.message,error.stack)
    }
}