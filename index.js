import { Graph } from "pawajs/src/graph/graph.js"
import { dom, store } from "./src/global.js"
import { components, lazyComponents } from "pawajs"
import { splitAndAdd } from "pawajs/src/utils.js"
import { state } from "./src/control-flow/state.js"
import { escapeHtml } from "./src/utils.js"
import { setServerHook } from "./src/hooks/index.js"
import { text } from "./src/control-flow/text.js"
import { attribute } from "./src/control-flow/attribute.js"
import { condition } from "./src/control-flow/if.js"
import { forEach } from "./src/control-flow/for.js"
import { key } from "./src/control-flow/key.js"
import { template } from "./src/control-flow/template.js"
import { Await } from "./src/control-flow/await.js"
import { createServerComponent } from "./src/component/index.js"
import { resolver } from "./src/stream.js"

setServerHook()
let isDevelopment = false

export const setDevelopment = (enabled = true) => {
  isDevelopment = Boolean(enabled)
  return isDevelopment
}

export const getDevelopment = () => isDevelopment

const reportServerError = (error, scope) => {
  if (isDevelopment) {
    const message = error instanceof Error ? error.stack || error.message : error
    console.error(`[pawa:ssr] ${scope}`, message)
    throw error
  }
}

  const singleElement=new Set()
  const setSingle=(...string)=>{
    string.forEach(v => singleElement.add(v))
  }
  setSingle('img', 'br', 'hr', 'input', 'meta', 'link', 'base', 'col', 'area', 'param', 'track', 'wbr');
export const createServerRender=(graph,contexts,strs,hydrates)=>{
    const renderGraph=Graph(graph)
    renderGraph.server=graph?graph.server:true
    let context={...contexts}
    let hydrate=hydrates
    let str=strs
    const setRender=(cxt,hyd,stream)=>{
        if(cxt)context=cxt
        if(hyd)hydrate=hyd
        if(stream){
          str=stream
        }
    }
    const render=async(el)=>{
      if (el.hasAttribute('only-client')) {
        el.removeAttribute('only-client')
       const fromTemp= renderGraph.nodeType === 'template' && renderGraph?.templateToClient
        str(`
          <template on-client p:id="${hydrate.id}" ${fromTemp?'temp="'+hydrate.id+'"':''}>${el.outerHTML}</template>
          `)
          return
      }
       const manifest= Array.from(el.attributes)
       
       const control={stop:false}
       for (const attr of manifest) {
        if(control.stop)return
        if (attr.name === 'if' || attr.name === 'else' || attr.name === 'else-if') {
            control.stop=true
            
            await condition(el,context,renderGraph,str,hydrate)
        }else if (attr.name === 'key') {
            control.stop=true
            await key(el,attr,context,renderGraph,str,hydrate)
        }else if (attr.name === 'for-each') {
            control.stop=true
            await forEach(el,attr,context,renderGraph,str,hydrate)
        }else if(attr.name === 'await' || attr.name === 'as-fallback' || attr.name === 'as-catch'){
            control.stop=true
            await Await(el,attr,context,renderGraph,str,hydrate)
        }else if (attr.name.startsWith('state-')) {
            control.stop=true
            
          await state(el,renderGraph,context,str,hydrate)
        }
       }
       if(control.stop)return
       if (el.tagName === 'TEMPLATE') {
        control.stop=true
        await template(el,context,renderGraph,hydrate,str)
        return
       }
    
       if(lazyComponents.has(splitAndAdd(el.tagName)) && !components.has(splitAndAdd(el.tagName))){
          try {
            const lazyComponent=lazyComponents.get(splitAndAdd(el.tagName))
          const {name,component} =lazyComponent
          const compo=await component()
          if(compo[name]){
            
            components.set(name.toUpperCase(),compo[name])
            lazyComponents.delete(name.toUpperCase())
          }
        } catch(error){
          reportServerError(error, `Failed to load component <${el.tagName}>`)
        }
    }
       if (components.has(splitAndAdd(el.tagName))) {
        control.stop=true
        await createServerComponent(el,context,renderGraph,hydrate,str)
        return
       }
       if(control.stop)return
       if (Array.from(el.childNodes).some(node =>
            node.nodeType === 3 && node.nodeValue.includes('@{')
        )){
            await text(el,context)
        }
       for (const attrs of Array.from(el.attributes)) {
        let name=attrs.name

            if (name.startsWith('#') || name.startsWith('-')) {
                el.removeAttribute(name)
              name=name.slice(1)
            }
            const attr={
                name:name,value:attrs.value
            }
        if(attr.value.includes('@{') && !attr.name.startsWith('#')){
            await attribute(el,attr,context,renderGraph)
        }
       }
       el.setAttribute('p:id',hydrate?.id ?? 'ssr')
       const replace=renderGraph.nodeType
       if (renderGraph.nodeType === 'template' && renderGraph?.templateToClient) {
        el.setAttribute('temp',hydrate.id)
        renderGraph.nodeType=''
       }
       
       if (hydrate && !hydrate.ref)hydrate.ref=hydrate?.id 
       const attr = Array.from(el.attributes)
    .map(att => `${att.name}="${escapeHtml(att.value)}"`)
    .join(' ');
  const attrStr = attr ? ` ${attr}` : '';
  const isSingle=singleElement.has(el.tagName.toLowerCase())
  const tagName = el.tagName.toLowerCase();
       if (hydrate?.arrayName && hydrate.enter) {
        hydrate.children.push(hydrate.id)
        hydrate.enter=''
       }
  str(`<${tagName}${attrStr}${isSingle ? ' />' : '>'}`);
if (!isSingle) {
   const children = el.childNodes;
   for(const child of children){
    if (child.nodeType === 3) {
      str(escapeHtml(child.nodeValue)) 
    }else if (child.nodeType === 8) {
      str(`<!--${child.nodeValue}-->`)
    }else if (child.nodeType === 1){
      await render(child);
    }
   };
    str(`</${tagName}>`)
  }
  if (replace === 'template' && renderGraph?.templateToClient) {
        renderGraph.nodeType='template'
       }
    }
return {renderGraph,render,setRender}
}
export const pawaServer=(html='',context={},stream=false,development=isDevelopment)=>{
  const previousDevelopment = isDevelopment
  const shouldSendStripWarning = Boolean(development)
  setDevelopment(development)
        const body = dom.parseFromString(html, 'text/html');
  
        const div = body.firstElementChild;
    const entry={
        stream:stream,
        psr:false,
        stripComponent:[],
        asClient:false,
        document:body,
        batch:[],
        cache:[],
        graph:{transport:{},onExit:()=>{},initialInsert:{},componentChildren:[],mount:[],unMount:[],effect:[],onEnter:()=>{},name:'ROOT',context:{},props:{},reProps:[],id:'ssr'}
    }
  
        let string=''  
        
        const str=(el)=>{
            string+=el
          }
        
        const hydrate={type:'root',children:[],id:'ssr',ref:''}
        const sendStripWarning=(write=str)=>{
          if (!shouldSendStripWarning) return ''
          const warning=`
            <script>
            (() => {
              const stripComponent=${JSON.stringify(entry.stripComponent || [])}
              console.warn("[Pawa SSR]:These components are static and will not be in the production SCP / will not re-execute on the client", stripComponent)
            })()
            </script>
            `
          write(warning)
          return warning
        }
    const render=async()=>{
        await store.run(entry, async () => {
            const {render,renderGraph}=createServerRender(null,{...context},str,hydrate)
            try {
              str(`<script>
            window.awaits={}
            window.states={}
            </script>`)
              await render(div)
            } catch (error) {
              reportServerError(error, 'Initial render failed')
            }
        })
        
        return {string,hydrate}
    }
    const batches=async (stream)=>{
       // ===== RESOLVE BATCHED ASYNC COMPONENTS =====
      await store.run(entry, async () => {
        
         let batch = store.getStore().batch;
         let maxDepth = 10; // Prevent infinite loops
         let depth = 0;
 
         while (batch.length > 0 && depth < maxDepth) {
             const currentBatch = [...batch];
             store.getStore().batch = [];
             await Promise.allSettled(currentBatch.map(item => resolver(stream,item)))
             batch = store.getStore().batch;
            depth++;
         }
       })
       setDevelopment(previousDevelopment)
    }
   return {render,batches,sendStripWarning}
}





