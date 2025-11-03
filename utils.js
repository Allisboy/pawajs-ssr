
exports.splitAndAdd=(string) => {
    const strings=string.split('-')
   let newString=''
   strings.forEach(str=>{
     newString+=str
   })
   return newString.toUpperCase()
}
exports.processNode = (node, itemContext) => {
  
  if (typeof itemContext === 'number') {
    return
  }
  
  if (node.nodeType === 3) { // Text node
    const text = node.textContent
    const newText = text.replace(/{{(.+?)}}/g, (match, exp) => {
      try {
        const keys = Object.keys(itemContext)
        
        const values = keys.map(key => itemContext[key])
        
        return new Function(...keys, `return ${exp}`)(...values)
      } catch {
        return match
      }
    })
    //console.log(newText)
    node.textContent = newText
  } else if (node.attributes) {
    Array.from(node.attributes).forEach(attr => {
      const newValue = attr.value.replace(/{{(.+?)}}/g, (match, exp) => {
        try {
          const keys = Object.keys(itemContext)
          const values = keys.map(key => itemContext[key])
          return new Function(...keys, `return ${exp}`)(...values)
        } catch {
          return match
        }
      })
      attr.value = newValue
    })
  }
  Array.from(node.childNodes).forEach((n) => {
    processNode(n, itemContext)
  })
}

exports.extractAtExpressions=(template) =>{
  const results = [];
  const regex = /@\{/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    let start = match.index + 2; // skip '@('
    let depth = 1;
    let i = start;

    while (i < template.length && depth > 0) {
      if (template[i] === '{') depth++;
      else if (template[i] === '}') depth--;
      i++;
    }

    if (depth === 0) {
      const expression = template.slice(start, i - 1).trim();
      results.push({
        fullMatch: template.slice(match.index, i),
        expression,
        start: match.index,
        end: i,
      });
    }
  }

  return results;
}

/**
 * Safely evaluates a JavaScript expression in a sandbox.
 *
 * @param {string} expr - The expression to evaluate.
 * @param {object} context - The context to expose inside the sandbox.
 * @param {string} error - pass in error message 
 * @returns {any} - The result of the evaluated expression or null on error.
 */
exports.evaluateExpr = (expr, context = {},error,element) => {
  try {
    const keys = Object.keys(context);
    const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, context));
    return new Function(...keys,`
      const require=null
      return ${expr}`)(...values)
  } catch (err) {
    console.error(`Evaluation failed for: ${expr}`,error,err.message,err.stack);
    if (element) {
      element._createError({message:`${error} ${err.message}`,stack:err.stack})
    }
    return null;
  }
};
exports.propsValidator=(obj={},propsAttri,name,template,el)=>{
  let done=true
  const jsTypes=['Array','String','Number']
  for (const[key,value] of Object.entries(obj)) {
    const propsValue=propsAttri[key]
    if(typeof value === 'object'){
      if(propsAttri[key] || propsAttri[key] === 0){
        const checker=ComponentProps(propsAttri[key],value?.err,name)
        if (value.type) {
        checker[value.type.name]()
        }
      }else{
        if (value.strict) {
          const msg=value.err?`${value.err}. the props is needed `: `props "${key}" is undefined at PawaComponent.${name}`
          done=false
          console.error(msg,`Error at ${template}`)
          el._createError({message:msg,stack:`ERROR at ${name} props validation`})
          el._setError()
          throw new Error(msg,`error at ${template}`);
        }else{
          if (value?.default || value?.default === 0) {
            propsAttri[key]=()=>value?.defualt
            el._props[key]=()=>value?.default
          }
        }

      }
    }
  }
  return done
}

exports.convertToNumber=(str)=>{
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash=(hash * 31 + str.charCodeAt(i)) | 0
  }
  return hash
};
const ComponentProps=(somes,message,name)=>{
let some=somes?.() || somes
    return({
    Array:()=>{

        if (Array.isArray(some)) {
            return true
        }else{
            throw new Error(message ?message + ' / Not type of an Array ': `${some} must be an array at ${name} component`);

        }
    },
    String:()=>{
        if (typeof some === 'string') {
            return true
        }else{
            throw new Error(message? message + ' / Not type of a String' :`${some} must be a string at ${name} component`);

        }
    },
    Number:()=>{
        if (typeof some === 'number') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Number ': `${some} must be a number at ${name} component`);

        }
    },
    Object:()=>{
        if (typeof some === 'object') {
            return true
        }else{
            throw new Error(message? message+' / Not type of an Object ' :`${some} must be an object at ${name} component`);

        }
    },
    Function:()=>{
        if (typeof some === 'function') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Function ': `${some} must be a function at ${name} component`);
        }
    },
    Boolean:()=>{
        if (typeof some === 'boolean') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Boolean ' :`${some} must be a Boolean at ${name} component`);

        }
    },
})

}

exports.ComponentProps=ComponentProps
exports.replaceTemplateOperators = (expression) => {
  return expression
    .replace(/\/\*/g, '`')
    .replace(/\*\//g, '`'); // Also replace closing */ with backtick if needed
};