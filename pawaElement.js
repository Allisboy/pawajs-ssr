import { HTMLElement, parseHTML } from "linkedom"
import {getPawaAttributes, getDevelopment } from "./index.js"
import {components} from 'pawajs'
import PawaComponent from "./pawaComponent.js"
import { evaluateExpr, splitAndAdd,replaceTemplateOperators } from "./utils.js"

// changed the hydrateProps 

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
        this._client=element.hasAttribute('client')
        this._props={}
        this._template=element.outerHTML
        this._component=null
        this._componentName=''
        this._thisSame=element.hasAttribute('pawa-same')
        this._arrangeAttribute={}
        this._pawaAlready=element.hasAttribute('p:c')
        /**@type {Array<{message:string,stack:string}>} */
        this._error=[]
        this._running=false
        this._hasForOrIf=this.hasForOrIf
        this._createError=this.createError
        this._setError=this.setError
        this._hydrateProps={}
        this._resumeAttr=''
        this._reArrangeAttri=this.reArrange
        this._replaceResumeAttr=this.replaceResumeAttr
        this._setResumeAttr=this.setResumeAttr
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
        this.pawaAttribute()
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
    attributes(){
      this._el.attributes.forEach((value, index,) => {
        this._arrangeAttribute[value.name]=value.value
      })
    }
    setResumeAttr(name){
      if(name.startsWith(':')) return
      this._resumeAttr+=`${name};`
      this._el.setAttribute('p:C',this._resumeAttr)
    }
    pawaAttribute(){
      const pawaAttr=getPawaAttributes()
      const setTextResume=()=>{
        if( this._componentName === ''&& this._el.firstElementChild === null && this._el.childNodes.some(node=>node.nodeType === 3 && node.nodeValue.includes('@{')) && !this._avoidPawaRender){
        return this._resumeAttr+='c-t'
     }
      }
      if (this._thisSame) {
        this._resumeAttr=this._el.getAttribute('p:c')
        this._el.removeAttribute('pawa-same')
      }else {
        if (this._el.hasAttribute('p:c')) {
          this._resumeAttr=this._el.getAttribute('p:c')
          this._el.attributes.forEach((value, index, array) => {
            if(this._resumeAttr.includes(value.name) || value.name === 'p:c')return
            if (value.name.startsWith(':')) return
            this._resumeAttr+=`${value.name};`
          })
        }else{
              this._el.attributes.forEach((value, index, array) => {
            if(this._resumeAttr.includes(value.name) || value.name === 'p:c' )return
            if (value.name.startsWith(':')) return
            this._resumeAttr+=`${value.name};`
          })
        }
        setTextResume()
      }
      this._el.setAttribute('p:c',this._resumeAttr)
    }
    replaceResumeAttr(name,newName,value,ele){
      if (ele === undefined) {
        this._el.setAttribute(newName,value)
        const array=this._resumeAttr.split(';')
        const index=array.indexOf(name,0)
        array[index]=newName
        const toString=array.join(';')
        this._el.setAttribute('p:c',toString)
        
      }else{
        ele.setAttribute(newName,value)
        ele.setAttribute('p:c',`${newName};`)
      }
    }
    reArrange(name,value,replace){
      const newAttribute={}
      if(this._arrangeAttribute){
        this._el.attributes.forEach((value, index) => {
          this._el.removeAttribute(value.name)
        })
        for (const [key,value] of Object.entries(this._arrangeAttribute)) {
          if (key === replace) {
            this._el.setAttribute(name,value)
          }else{
            this._el.setAttribute(key,value)
          }
        }
      }
    }
    hasForOrIf(){
        if (this._el.getAttribute('if') || this._el.getAttribute('for') || this._el.getAttribute('else') || this._el.getAttribute('else-if')) {
          return true
        }else{
          return false
        }
      }
      
      getComponent(){
        if (components.has(splitAndAdd(this._el.tagName.toUpperCase())) && !this._client) {
          this._componentName=splitAndAdd(this._el.tagName.toUpperCase())
          this._component=new PawaComponent(components.get(splitAndAdd(this._el.tagName.toUpperCase())))
          Array.from(this._el.children).forEach(slot =>{
        
            if (slot.tagName === 'TEMPLATE' && slot.getAttribute('prop')) {
              
              this._slots.appendChild(slot)
            }
          })
          this._componentChildren=this._el.innerHTML
        }else{
          if(this._el.hasAttribute('only-client')){
            this._el.removeAttribute('only-client')
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
         const allServerAttr=getPawaAttributes()
          this._el.attributes.forEach(attr=>{
            if(!allServerAttr.has(attr.name)){
              if ( !attr.name.startsWith(':')) {
                if( attr.name.startsWith('c-') || attr.name.startsWith('p:c')) return
                let name=''
                if (attr.name.startsWith('-')) {
                  name=attr.name.slice(1)
                }else{
                  name=attr.name
                }
                this._restProps[name]={name:name,value:attr.value}
                
              } else if(attr.name.startsWith(':')) {
                this._hydrateProps[attr.name.slice(1)]=attr.value
                if(attr.value === '') attr.value=true;
                try {
                  const func = evaluateExpr(`()=>{
                  const prop= ${replaceTemplateOperators(attr.value)};
                  if(prop === '')return prop
                  return prop
                  }
                  `,this._context,`setting props at ${attr.name} - ${attr.value} : ${this._template}`)
                const name=attr.name.slice(1)
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
export default PawaElement