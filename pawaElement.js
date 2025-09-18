const { HTMLElement, parseHTML } = require("linkedom")
const { getAllServerAttrArray, getPawaComponentsMap, getDevelopment } =require("./index.js")
const PawaComponent = require("./pawaComponent.js")
const { evaluateExpr, splitAndAdd,replaceTemplateOperators } =require("./utils.js")


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
        this._avoidPawaRender=element.hasAttribute('s-pawa-avoid')
        this._props={}
        this._template=element.outerHTML
        this._component=null
        this._componentName=''
        /**@type {Array<{message:string,stack:string}>} */
        this._error=[]
        this._running=false
        this._hasForOrIf=this.hasForOrIf
        this._createError=this.createError
        this._setError=this.setError
        if(this._avoidPawaRender){
      element.removeAttribute('s-pawa-avoid')
      Array.from(element.children).forEach((child) => {
        if (child.nodeType === 1) {
          child.setAttribute('s-pawa-avoid','')
        }
      })
    }
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
        if (this._el.getAttribute('s-if') || this._el.getAttribute('s-for') || this._el.getAttribute('s-else') || this._el.getAttribute('s-else-if')) {
          return true
        }else{
          return false
        }
      }
      
      getComponent(){
       const components=getPawaComponentsMap()
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
          if(this._el.hasAttribute('client')){
            this._el.removeAttribute('client')
          }
        }
      }
      setError(){
        if (getDevelopment() && this._error.length > 0) {
          this._el.setAttribute('ssr-error',JSON.stringify(this._error))
        }
      }
      createError({message,stack}){
        this._error.push({message,stack})
      }
      //set Component props
      setProps(){
        if (this._componentName) {
         const allServerAttr=getAllServerAttrArray()
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
                  const func = evaluateExpr(replaceTemplateOperators(attr.value),this._context,`setting props at ${attr.name} - ${attr.value} : ${this._template}`)
                const name=attr.name
                this._props[name]=func
                } catch (error) {
                  console.log(error.message,error.stack)
                  this._createError({message:error.message,stack:error.stack})
                }
              }
            }
          })
        }
      }
}
module.exports = PawaElement