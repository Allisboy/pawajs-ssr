import { createServerRender } from "../../index.js";
import { safeEval } from "pawajs";
import { isProxy, pawaGenerateId } from "../utils.js";

export const key=async(el,attr,context,graph,str,hydrate)=>{
    const {result:value,client}=isProxy(()=>safeEval(attr.value,context,true))
    const id=pawaGenerateId()
    const storePath=`
    <template p:store="${id}">
        ${el.outerHTML}
    </template>
    `
    const html=el.outerHTML
    const KeyHydrate={
        id:id,
        type:'key',
        ref:'',
        key:value,
        children:[]
    }
    if (hydrate?.arrayName && hydrate.id) {
      KeyHydrate.forkey=hydrate.id
    }
    if(!hydrate.ref)hydrate.ref=client?'ref':''
   if(client)hydrate.children.push(KeyHydrate)
    if (typeof value !== 'undefined') {
        el.removeAttribute(attr.name)
        const newElement=el.cloneNode(true)
        const {render,renderGraph}=createServerRender(graph,context,str,client?KeyHydrate:hydrate)
        if(client)str(storePath)
            renderGraph.nodeType='key'
        renderGraph.templateToClient=client
        await render(newElement)
    }else{
        if(client)str(`<template only-client p:id="${hydrate.id}">${html}</template>`)
    }
    
}