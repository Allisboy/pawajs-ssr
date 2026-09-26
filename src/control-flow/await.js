import { getComponentGraph, setComponentGraph } from "pawajs"
import { getContexters, safeEval } from "pawajs/src/utils.js"
import { createServerRender } from "../../index.js"
import { dom, store } from "../global.js"
import { pawaGenerateId } from "../utils.js"

export const Await=async(el,attr,context,graph,str,hydrate)=>{
    if (!el.hasAttribute('await')) {
        return
    }
    const client=!graph.server
    const cache=safeEval(attr.value,context)
    const isStream=store.getStore().stream
    const stopStream=el.getAttribute('no-stream')
    const {values}=getContexters(context)
    let awaits=el.cloneNode(true)
    awaits.removeAttribute('await')
    let whileAwait
    let awaitError
    while (el.nextElementSibling?.hasAttribute('as-fallback') || el.nextElementSibling?.hasAttribute('as-catch')) {
        if (el.nextElementSibling.hasAttribute('as-fallback')) {
            whileAwait=el.nextElementSibling.cloneNode(true)
            whileAwait.removeAttribute('as-fallback')
            el.nextElementSibling.remove()
        }else {
            awaitError=el.nextElementSibling.cloneNode(true)
            el.nextElementSibling.remove()
            awaitError.removeAttribute('as-catch')
        }
    }
    const id=pawaGenerateId()
    if (!isStream || stopStream) {
        const awaitHydrate={
            type:'await',
            resolved:true,
            ref:'',
            children:[],
            id:id
        }
        if (hydrate?.arrayName && hydrate.id) {
    awaitHydrate.forkey=hydrate.id
    }
        if (!hydrate.ref)hydrate.ref=client?'ref':'' 
        try {

           const res= await cache(...values)()
           
                const as=awaits.getAttribute('as') ?? 'res'
               awaits.removeAttribute('as')
               const item={
                ...context,
                [as]:res
               }
            const {render,renderGraph}=createServerRender(graph,item,str,client?awaitHydrate:hydrate)
            
          if(client)  hydrate.children.push(awaitHydrate)
            renderGraph.templateToClient=client
           await render(awaits)
        } catch (error) {
            console.log(error,'failed');
            
            if (awaitError) {
                const newElement=awaitError.cloneNode(true)
                const as=newElement.getAttribute('as') ?? 'error'
               newElement.removeAttribute('as')
               const item={
                ...context,
                [as]:error
               }
               
                const {render,renderGraph}=createServerRender(graph,item,str,client?awaitHydrate:hydrate)
               if(client) hydrate.children.push(awaitHydrate)
                renderGraph.templateToClient=client
               await render(awaitError)
        }
    }
}else{
    const id=pawaGenerateId()
    const awaitsLoading={
        type:'await',
        resolved:false,
        id:id,
        children:[],
        ref:'',
    }
     if (hydrate?.arrayName && hydrate.id) {
      awaitsLoading.forkey=hydrate.id
    }
    const {render,setRender}=createServerRender(graph,context,str,awaitsLoading)
    hydrate.children.push(awaitsLoading)
    const doc=store.getStore().document.createElement('div')
    const newElement=whileAwait || doc
    newElement.removeAttribute('as-fallback')
    str(`<div await-id="${id}">`)
    await render(newElement)
    str('</div>')
    const stream={
        awaits:awaits,
        awaitError:awaitError,
        promise:async()=>cache(...values)(),
        context:context,
        graph:graph,
        client:client,
        componentGraph:getComponentGraph(),
        id:id,
        setRender:setRender,
        render:render,
        setComponentGraph:setComponentGraph,
        hydrate:hydrate
    }
    store.getStore().batch.push(stream)
}
}