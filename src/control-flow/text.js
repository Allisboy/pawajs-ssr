import { getContexters, safeEval } from "pawajs/src/utils.js"
import { extractAtExpressions, isProxy } from "../utils.js";

export const text=async (el,context)=>{
    const {}=getContexters(context)
      const nodesMap = new Map();
      const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === 3);
  textNodes.forEach(node => {
    nodesMap.set(node, node.nodeValue);
  });
const textContent=el.innerText

  // --- Evaluate and replace text content ---
  const evaluate = () => {
    let reactive=false
    try {
      textNodes.forEach( textNode => {
        let value = nodesMap.get(textNode); // Always start from original text
        
        const expressions = extractAtExpressions(value);
        expressions.forEach(async ({ fullMatch, expression }) => {
          const {result:func,client} =isProxy(()=>safeEval(
            expression,
            context,
            true
          ))
          if(!reactive)reactive=client
          if (expression === '') {
            return
          }
          value = value.replace(fullMatch, String(func));
        });
        
        textNode.nodeValue = value;
      });
      if (reactive) {
        el.setAttribute('#text-content',textContent)
      }
      
    }
    catch (error){
      console.error(`[Error]: from ${textContent}`,error.message)
    }
}
evaluate()
}