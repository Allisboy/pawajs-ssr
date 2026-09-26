
import { getComponentGraph, setComponentGraph } from "pawajs"
import { propsValidator, sanitizeTemplate } from "pawajs/src/component/utils.js"
import { components } from "pawajs/src/global.js"
import { splitAndAdd } from "pawajs/src/utils.js"
import { createServerRender } from "../../index.js"
import { getDevelopment } from "../../index.js"
import { store } from "../global.js"
import { isComponentClient, isProxy, pawaGenerateId } from "../utils.js"
import { checkIfClient, initaiteComponent, renderAschild, setSlot } from "./utils.js"
export const createServerComponent=async (el,context,graph,hydrate,str)=>{
 try {
    const id=pawaGenerateId()
  const componentName=splitAndAdd(el.tagName)
  const compohydrate={
    type:'component',
    name:componentName,
    id:id,
    children:[],
    ref:'',
    template:null,
    props:{},
    data:{}
   }
   let clone=el.outerHTML
   const stream=store.getStore().stream
   const componentGraph=getComponentGraph()
   const server=graph.server
    const {aschild,isClient:propIsClient,prop,restProps,slot,stringProp, passerProps}=initaiteComponent(el,context)
    const {render,renderGraph,setRender}=createServerRender(graph,context,str,hydrate)
    
    if(!hydrate?.ref)hydrate.ref=''
   const former=getComponentGraph()
    renderGraph.former=former
    setComponentGraph(renderGraph)
    renderGraph.context={...context}
    renderGraph.nodeType='component'
    renderGraph.rest={}
    if (hydrate?.arrayName && hydrate.id) {
      compohydrate.forkey=hydrate.id
    }
    Object.assign(renderGraph.transport, former?.transport ?? {})
    const mainProp={}
    const data={}
    for (const [key,value] of Object.entries({...prop,...stringProp})) {
        mainProp[key]=value
    }
    const component=components.get(componentName)
        if (typeof component !== 'function') {
            throw new Error('Must be A functional Component')
        }
        if (component.validateProps) {
            const validate=component.validateProps
            try {
                propsValidator(validate,{...prop,stringProp},el.tagName,el.outerHTML,mainProp)
            } catch (error) {
              console.error(`Failed to validate props for <${el.tagName}>`, error);
            }
        }
        const body=store.getStore().document
        let componentIsReactive=false
        try {
          
            const {client:compoClient,result}=await isComponentClient(async()=>await component(mainProp))
           const temp=sanitizeTemplate(result)
            const {isClient}=checkIfClient(renderGraph,component)
            if(temp === '')return
             let  div = body.createElement('div');
                    div.innerHTML=temp
                    
            const {asChild,element}=renderAschild(div,aschild,slot.default)
            if (!asChild) {
                setSlot(element,slot)
            }
             const findElement= element.hasAttribute('--')?element:element.querySelector('[--]') 
         if (findElement) {
           
           findElement.removeAttribute('--')
          }
          const rest={...passerProps}
          if (Object.entries(renderGraph.rest).length > 0) {
      const props=restProps
      if (renderGraph.rest['className'] && props['class']) {
        rest['class']={...props['class']}
      }
      if (renderGraph.rest['defaultValue'] && props['default']) {
        rest['default']={...props['default']}
      }

      for (const key in props) {
        let name=key
        name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());        
        if (renderGraph.rest[name]) {
          rest[key]=props[key]
        }
      }
    }else{
      Object.assign(rest,restProps)
    }
    
    if(Object.entries(rest).length > 0){
        
      if (el.tagName === 'D-TEXT') {
        // console.log(rest,':',renderGraph.rest,':',mainProp);
        
      }
      if (findElement) {
        for (const key in rest) {
          if (el.tagName === 'D-TEXT') {
            // console.log(key);
            
          }
          let name=key
          while (findElement.hasAttribute(name)) {
            name=`-${name}`
          }
          findElement.setAttribute(name,rest[key])
          
          }
        }
      }
      
      // if (!graph.server || propIsClient || isClient || compoClient) {
      //    componentIsReactive=true
      //   if (server) {
      //       compohydrate.pass=true
      //   }
      //   renderGraph.server=false
      // this will be the client static stripping (under architectural thought)
      //send data if its client component
      if (propIsClient || isClient || compoClient) {
        if (getDevelopment()) {
          str(`<template hmr="${id}">${clone}</template>`)   
        }
        renderGraph.server=false
          componentIsReactive=true
        if (server) {
            compohydrate.pass=true
        }
        if (!server && renderGraph?.setContext) {
          componentIsReactive=true
        }
         
      if (renderGraph?.promise?.length > 0 && stream) {
        store.getStore().batch.push({id:id,promise:renderGraph.promise})
      }else if (renderGraph?.promise?.length > 0) {
        const promises=renderGraph?.promise
        const res=await Promise.allSettled(promises.map(async m =>{
          try {
            
            const re= await m.promise
            return {success:re, name:m.name}
        } catch (error) {
            return {error:error,name:m.name}
        }
    }))
    const chunk=`
    <script id="${id}">
    (() => {
        const result=${JSON.stringify(res)}
        if (Array.isArray(window.states?.['${id}'])) {
            const setup=window.states['${id}']
                setup.forEach(f => f(result))
        } else {
            window.awaits['${id}']=result
        }
    })()
            </script>
            `
            str(chunk)
      }
      
    
    if (server) {

    for (const [key, value] of Object.entries(mainProp)) {
            compohydrate.props[key] = value()
          }
    }else{
      const sendProp={}
      const totalProp={...restProps,...stringProp}
      for (const key in totalProp) {
        if (restProps[key] || restProps[key] === '') {
          sendProp[key]=restProps[key]
        }else if(stringProp[key]){
          sendProp[`$${key}`]=stringProp[key]
        }
      }
      compohydrate.props=sendProp
    } 
        if (Array.isArray(renderGraph?.promise)) {
           store.getStore().cache.push({id,promise:renderGraph.promise})
        }
        if(!hydrate.ref)hydrate.ref='ref'
        hydrate.children.push(compohydrate)
        setRender(null,compohydrate)
      } else if (getDevelopment() && graph?.server === false ) {
        str(`<template hmr="${id}">${clone}</template>`)   
        const request=store.getStore()
        if(!hydrate.ref)hydrate.ref='ref'
        const devComponent={
          ...compohydrate,
          devOnly:true,
        }
        setRender(null,devComponent)
        if (hydrate?.children) {
          hydrate.children.push(devComponent)
        }
        if (request?.stripComponent && !request.stripComponent.some((item) => item.name === componentName)) {
          request.stripComponent.push({
            name:componentName,
            template:el.outerHTML,
          })
        }
      }
      setRender({...renderGraph.context})
      renderGraph.templateToClient=componentIsReactive || graph?.templateToClient 
      await render(element)
        } catch (error) {
          console.error(`Failed to render <${el.tagName}>`, error);
          if (getDevelopment()) throw error
        }
     } catch (error) {
      console.error(`Failed to initialize <${el?.tagName ?? 'unknown'}>`, error);
      if (getDevelopment()) throw error
     }
}