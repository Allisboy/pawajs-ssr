import { createServerRender } from "../../index.js";
import { getContexters, safeEval } from "pawajs/src/utils.js";
import { isProxy, pawaGenerateId } from "../utils.js";

export const forEach=async(el,attr,context,graph,str,hydrate)=>{
    const value = attr.value
    const split = value.split(' in ')
    const arrayName = split[1]
    const arrayItems = split[0].split(',')
    const arrayItem = arrayItems[0]
    const indexes = arrayItems[1]
    const forKey=el.getAttribute('for-key')
    let reactive=false
    const id=pawaGenerateId()
    const storePath=`
    <template p:store="${id}">
        ${el.outerHTML}
    </template>
    `
    const html=el.outerHTML
    const {result:array,client}=isProxy(()=>safeEval(arrayName,context,true))
    const getKey=(item,index)=>{
        if(!forKey)return index
      let newKey=forKey.replace(/{{(.+?)}}/g, (match, exp) => {
            const forkeys=safeEval(exp,item)
            const {values:val}=getContexters(item)
            return forkeys(...val)
        })
        return newKey
    }
    array.reverse()
    const arrayKey=array.map((element,index) => {
                const itemContext={
                    ...context,
                    [arrayItem]:element,
                    [indexes]:index
                }
                return getKey(itemContext,index)
            })
    if (client || !graph.server && indexes) {
        reactive=true
    }
    if(!hydrate.ref)hydrate.ref=reactive?'ref':''
    const forHydrate={
        type:'for',
        ref:'',
        id:id,
        arrayName:arrayName,
        arrayItem:arrayItem,
        indexes:indexes,
        forkey:forKey,
        key:'',
        children:[]
    }
    if (Array.isArray(array) && array.length > 0) {
        if (reactive) {
                hydrate.children.push(forHydrate)
            str(storePath)
        }
        //  Use for...of to ensure await works correctly in SSR
        
        for (let i = arrayKey.length - 1; i >= 0; i--) {
            const item=array[i]
            const itemContext={
                ...context,
                [arrayItem]: item,
                [indexes]: i,
            }
            const key=getKey(itemContext,i)
            forHydrate.enter='now'
            
            const {render,renderGraph}=createServerRender(graph,itemContext,str,reactive?forHydrate:hydrate)
            renderGraph.nodeType='for-key'
            renderGraph.templateToClient=reactive
            const newElement=el.cloneNode(true)
            newElement.removeAttribute(attr.name)
            newElement.removeAttribute('for-key')
            forHydrate.id=`${id}-${key}`
            await render(newElement)

        }
    }else{
        if (client) {
            str(`<template only-client p:id="${hydrate.id}">${html}</template>`)
        }
    }
    forHydrate.enter=''
    forHydrate.id=id
}