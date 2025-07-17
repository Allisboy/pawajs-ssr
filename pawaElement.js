import { HTMLElement, parseHTML } from "linkedom"
import { allServerAttr, components } from "./index.js"
import PawaComponent from "./pawaComponent.js"
import { evaluateExpr, splitAndAdd,replaceTemplateOperators } from "./utils.js"

class PawaElement {
  /**
   * 
   * @param {HTMLElement} element 
   * @param {object} context 
   */
    constructor(element,context) {
      const {document}=parseHTML()
      /**
       * @type{PawaElement|HTMLElement}
       */
        this._el=element
        this._slots=document.createDocumentFragment()
        this._context=context
        this._props={}
        this._template=element.outerHTML
        this._component=null
        this._componentName=''
        this._running=false
        this._hasForOrIf=this.hasForOrIf
        /** 
        * @typedef{object}
        * @property{any} 
        * Object of Html Attributes for Rest Attributes
        */
        this._restProps={}
        this._componentChildren=null
        this.getComponent()
        this.setProps()
    }
    /**
     * 
     * @param {HTMLElement} el 
     * @param {object} context 
     * @returns {PawaElement}
     */
    static Element(el,context){
        const pawa=new PawaElement(el,context)
        Object.assign(el,pawa)
        return el   
    }
    hasForOrIf(){
        if (this._el.getAttribute('server-if') || this._el.getAttribute('server-for') || this._el.getAttribute('server-else') || this._el.getAttribute('server-else-if')) {
          return true
        }else{
          return false
        }
      }
      
      getComponent(){
        if (components.has(splitAndAdd(this._el.tagName.toUpperCase())) && this._el.getAttribute('client') === null) {
          this._componentName=splitAndAdd(this._el.tagName.toUpperCase())
          this._component=new PawaComponent(components.get(splitAndAdd(this._el.tagName.toUpperCase())))
          Array.from(this._el.children).forEach(slot =>{
        
            if (slot.tagName === 'TEMPLATE' && slot.getAttribute('prop')) {
              
              this._slots.appendChild(slot)
            }
          })
          this._componentChildren=this._el.innerHTML
        }else{
          if(this._el.getAttribute('client')){
            this._el.removeAttribute('client')
          }
        }
      }

      //set Component props
      setProps(){
        if (this._componentName) {
        
          this._el.attributes.forEach(attr=>{
            if(!allServerAttr.includes(attr.name)){
              if (attr.name.startsWith('-') || attr.name.startsWith('r-')) {
                let name=''
                if (attr.name.startsWith('r-')) {
                  name=attr.name.slice(2)
                } else {
                  name=attr.name.slice(1)
                }
                
                this._restProps[name]={name:name,value:attr.value}
                
              } else {
                try {
                  const func = evaluateExpr(replaceTemplateOperators(attr.value),this._context)
                const name=attr.name
                this._props[name]=func
                } catch (error) {
                  console.log(error.message,error.stack)
                }
              }
            }
          })
        }
      }
}
export default PawaElement