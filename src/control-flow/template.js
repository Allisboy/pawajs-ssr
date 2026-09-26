import { createServerRender } from "../../index.js"
import { store } from "../global.js"
import { pawaGenerateId } from "../utils.js"

export const template=async(el,context,graph,hydrate,str)=>{
    const original=!el.hasAttribute('p:store')
    const client=graph?.templateToClient
    const {document}=store.getStore()
    const tempHydrate={
        type:'template',
        children:[],
        ref:'',
        id:pawaGenerateId()
    }
    if(!original)return
    if (hydrate?.arrayName && hydrate.id) {
      tempHydrate.forkey=hydrate.id
    }
    if(!hydrate.ref)hydrate.ref=client?'ref':''
    const {render,renderGraph}=createServerRender(graph,context,str,client?tempHydrate:hydrate)
    if(client)hydrate.children.push(tempHydrate)
    renderGraph.nodeType='template'
    renderGraph.templateToClient=client
    const children=Array.from(el.content.children)
   
    for (const element of children) {
      await  render(element)
    }
    
}