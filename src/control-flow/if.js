import { createServerRender } from "../../index.js";
import { setChained } from "pawajs/src/control-flow/utils.js";
import { getContexters, safeEval } from "pawajs/src/utils.js";
import { isProxy, pawaGenerateId } from "../utils.js";

export const condition=async(el,context,graph,str,hydrate)=>{
  if (!el.getAttribute('if')) {
    return
  }
      const chained=[{
          exp:el.getAttribute('if'),
          condition:'if',
          element:el
        }]
        const chainMap = setChained(el,chained);
        const {keys,values}=getContexters(context)
        const server=graph.server
        let latestChain
      const func = new Map();
            chained.forEach((item) => {
              if (item.condition === "else") return;
              let funcs = safeEval(item.exp,context);
              func.set(item.exp, funcs);
            });
        let current
        let reactive=false
    for (const element of chained) {
      if (current || element.condition === "else") continue;
      try {
        const {result,client}=isProxy(()=>func.get(element.exp)(...values))
        if(!reactive)reactive=client
        current = result

        if (current) {
          latestChain = {
            id: element.exp,
            condition: element.condition,
          };
          break;
        }
      } catch (error) {
        
        throw {
          msg:error.message,
          stack:error.stack,
          effect:element.condition,
          ref:element.element.outerHTML,
          exp:element.exp
        }
      }
    }
    if (!latestChain) {
      latestChain = {
        id: "else",
        condition: "else",
      };
    }
    const id=pawaGenerateId()
    let storePath=`<template p:store="${id}">`
    chained.forEach(c=>{
        storePath+=c.element.outerHTML
    })
    storePath+='</template>'
    const conditionHydrate={
        type:'condition',
        ref:'',
        current:{id:latestChain.id,exp:latestChain.condition},
        id:id,
        children:[]
    }
    const isAvailable=chainMap.get(latestChain?.id)
    if (isAvailable) {
        if(reactive)str(storePath)
    if (hydrate?.arrayName && hydrate?.id) {
      conditionHydrate.forkey=hydrate?.id
    }
    if (!hydrate.ref)hydrate.ref=reactive?"ref":''
   if(reactive) hydrate.children.push(conditionHydrate)
        const {render,renderGraph}=createServerRender(graph,context,str,reactive?conditionHydrate:hydrate)
      renderGraph.nodeType='condition'
      renderGraph.templateToClient=reactive
        const newElement=chainMap.get(latestChain.id)?.element?.cloneNode?.(true)
        newElement.removeAttribute(chainMap.get(latestChain.id).condition)
      await  render(newElement)
    }else{
       if(reactive)str(`
          <template only-client p:id="${hydrate.id}">${chained.map(c=>{
        return c.element.outerHTML
    }).join(' ')}</template>
        `)
    }

}
