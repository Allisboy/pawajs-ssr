import { HTMLElement } from "linkedom"
import { getContexters, safeEval } from "pawajs/src/utils.js"
import { $state } from "pawajs/src/hooks/state.js"
import { pawaGenerateId } from "../utils.js"
import { createServerRender } from "../../index.js"


/**
 * @param {HTMLElement} el
 * @param {{}} graph
 * @param {{}} context
 * @param {(s)=>} str
 * @param {{}} hydrate
 */
export const state=async(el,graph,context,str,hydrate)=>{
    const getAllState=Array.from(el.attributes).filter(attr=>attr.name.startsWith('state-'))
    const itemContext={
        ...context
    }
    
    const {}=getContexters({$state,...context})
    const values=[]
    for (const attr of getAllState) {
        el.removeAttribute(attr.name)
        const name=attr.name.split('-')[1]
        const value=safeEval(`()=>{
            return $state(${attr.value})
            }
            `,{$state,...context},true)()

            itemContext[name] = null
        itemContext[name] = value
        
        values.push({name:name,value:value.value})
    }
    const stateHydrate={
        type:'state',
        id:pawaGenerateId(),
        values:values,
        children:[],
    }
    const {render}=createServerRender(graph,itemContext,str,stateHydrate)
    hydrate.children.push(stateHydrate)
    
    await render(el)
}