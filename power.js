const {render} = require("./index.js");
const { convertToNumber,evaluateExpr } = require("./utils.js");

exports.If = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  if (nextSibling && (nextSibling.getAttribute('s-else') !== null || nextSibling.getAttribute('s-else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const result = evaluateExpr(attr.value, el._context,`at s-if directives check - ${attr.value}`);
  if (result) {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('s-if');
    newElement.setAttribute('s-data-if', convertToNumber(attr.value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  } else {
    el.remove();
  }
};

exports.Else = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const value = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');
  const result = evaluateExpr(value, el._context,`at s-else directives performing previous condition check - ${value}`);
  if (result) {
    el.remove();
  } else {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('s-else');
    newElement.setAttribute('s-data-else',convertToNumber(value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  }
};

exports.ElseIf = (el, attr) => {
  if (el._running) return;
  el._running = true;

  const nextSibling = el.nextElementSibling || null;
  const prevCondition = el.getAttribute('data-if') || '';
  el.removeAttribute('data-if');

  if (nextSibling && (nextSibling.getAttribute('s-else') !== null || nextSibling.getAttribute('s-else-if'))) {
    
    nextSibling.setAttribute('data-if', attr.value);
  }

  const prevResult = evaluateExpr(prevCondition, el._context,`at s-else-if directives performing s-if evaluation check - ${prevCondition}`);
  const currentResult = evaluateExpr(attr.value, el._context,`at s-else-if directives check - ${attr.value}`);

  if (prevResult) {
    el.remove();
  } else if (currentResult) {
    const newElement = el.cloneNode(true);
    newElement.removeAttribute('s-else-if');
    newElement.setAttribute('s-data-else-if', convertToNumber(attr.value));
    el.replaceWith(newElement);
    render(newElement, el._context);
  } else {
    el.remove();
  }
};

exports.For=(el,attr)=>{
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
    const array=evaluateExpr(arrayName,el._context,`at s-for directives check - ${attr.value}`)
    if(Array.isArray(array)){
      array.forEach((item,index)=>{
        const context=el._context
        const itemContext = {
          [indexes]: index,
          ...context
        }
        itemContext[arrayItem]=item
        const newElement=el.cloneNode(true)
        newElement.removeAttribute('s-for')
        newElement.setAttribute('s-data-for',convertToNumber(attr.value))
        newElement.setAttribute('s-index',index)
        el.parentElement.insertBefore(newElement,el)
        render(newElement,itemContext)
        if (newElement.getAttribute('s-key')) {
          newElement.setAttribute('s-data-loop-key',convertToNumber(newElement.getAttribute('s-key')))
          newElement.removeAttribute('s-key')
        }
      })
    }
    el.remove()
    } catch (error) {
      console.error(error.message,error.stack)
    }
}