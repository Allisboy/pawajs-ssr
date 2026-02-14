
export const splitAndAdd=(string) => {
    const strings=string.split('-')
   let newString=''
   strings.forEach(str=>{
     newString+=str
   })
   return newString.toUpperCase()
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const pawaGenerateId = (length = 10) => {
  const rb = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[rb[i] % alphabet.length];
  }
  return result;
};
export const reArrangeAttri=(el,name,value,replace)=>{
    const attr={}
    // Snapshot attributes to array to safely remove them while iterating
    Array.from(el.attributes).forEach(att =>{
      attr[att.name]=att.value
      el.removeAttribute(att.name)
    })
    if(!replace){
      attr[name]=value
    }
    const array=Object.entries(attr)
    
    // Standard reverse loop is safer and faster than the previous while loop
    for (let i = array.length - 1; i >= 0; i--) {
      const [key, val] = array[i];
      if(key === replace){
        el.setAttribute(name,value)
      }else{
        el.setAttribute(key,val)
      }
    }
}
export const resumeAttribute=(el,name,value,not=false)=>{
   const attr={}
   const resAttr={}
   if (not) {
    resAttr[name]=value
   }
   el.attributes.forEach(value=>{
    if(value.name.startsWith('resume-')){
      resAttr[value.name]=value.value
    }else{
      attr[value.name]=value.value
    }
    el.removeAttribute(value.name)
   })
   for(const [key,values] of Object.entries(attr)){
    el.setAttribute(key,values)
   }
   if(!not){
     el.setAttribute(name,value)
   }
   for(const [key,values] of Object.entries(resAttr)){
     el.setAttribute(key,values)
    }
    
}
export const processNode = (node, itemContext) => {
  
  if (typeof itemContext === 'number') {
    return
  }
   if (node.attributes) {
    Array.from(node.attributes).forEach(attr => {
      if (attr.name !== 'for-key') return
      const newValue = attr.value.replace(/{{(.+?)}}/g, (match, exp) => {
        // Use the cached expression evaluator for performance
        const result = evaluateExpr(exp, itemContext, `in processNode for attribute ${attr.name}: ${exp}`);
        return result !== null ? String(result) : match;
      })
      attr.value = newValue
    })
  }
}

export const extractAtExpressions=(template) =>{
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
const expressionCache = new Map();

export const evaluateExpr = (expr, context = {},error,element) => {
  try {
    const keys = Object.keys(context);
    // Create a cache key based on the expression and the available context keys
    // We sort keys to ensure consistent cache hits regardless of key order
    const cacheKey = expr + '|||' + keys.sort().join(',');

    let func = expressionCache.get(cacheKey);
    if (!func) {
      func = new Function(...keys, `
        const require=null
        return ${expr}`);
      expressionCache.set(cacheKey, func);
    }

    const values = keys.map((key) => context[key]);
    return func(...values);
  } catch (err) {
    console.error(`Evaluation failed for: ${expr}`,error,err.message,err.stack);
    if (element) {
      element._createError({message:`${error} ${err.message}`,stack:err.stack})
    }
    return null;
  }
};
export const propsValidator=(obj={},propsAttri,name,template,el)=>{
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
          if (value?.default !== undefined) {
            propsAttri[key]=()=>value?.defualt
            el._props[key]=()=>value?.default
          }
        }

      }
    }
  }
  return done
}

export const convertToNumber=(str)=>{
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash=(hash * 31 + str.charCodeAt(i)) | 0
  }
  return hash
};
export const ComponentProps=(somes,message,name)=>{
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
export const replaceTemplateOperators = (expression) => {
  return expression
    .replace(/\/\*/g, '`')
    .replace(/\*\//g, '`'); // Also replace closing */ with backtick if needed
};

