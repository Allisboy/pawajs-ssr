import {VM} from 'vm2'
export const splitAndAdd=(string) => {
    const strings=string.split('-')
   let newString=''
   strings.forEach(str=>{
     newString+=str
   })
   return newString.toUpperCase()
 }

 export const matchRoute = (pattern, path) => {
  // Remove trailing slashes for consistency
  const cleanPattern = pattern.replace(/\/$/, '');
  const cleanPath = path.replace(/\/$/, '');
  
  const patternParts = cleanPattern.split('/');
  const pathParts = cleanPath.split('/');
  
  if (patternParts.length !== pathParts.length) {
    
    return [false, {}];
  }
  
  const params = {};
  
  const match = patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      // This is a parameter
      const paramName = part.slice(1);
      params[paramName] = pathParts[index];
      return true;
    }
    return part === pathParts[index];
  });
  
  return [match, params];
}
export const sanitizeTemplate = (temp) => {
  if (typeof temp !== 'string') return '';
  return temp.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '');
};
/**
 * Safely evaluates a JavaScript expression in a sandbox.
 *
 * @param {string} expr - The expression to evaluate.
 * @param {object} context - The context to expose inside the sandbox.
 * @returns {any} - The result of the evaluated expression or null on error.
 */
export const evaluateExpr = (expr, context = {}) => {
  try {
    const vm = new VM({
      timeout: 150,
      sandbox: { ...context },
      require:false
    });

    return vm.run(expr);
  } catch (err) {
    console.warn(`Evaluation failed for: ${expr}`, err.message);
    return null;
  }
};
export const propsValidator=(obj={},propsAttri,name)=>{
  let newObj={}
  
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
          console.warn(`props ${key} at ${name} component props is needed`)
          throw new Error(` ${key} props is needed`|| `${key}  props undefined ${name}`);
        }else{
          if (value.default || value.default === 0) {
            propsAttri[key]=value.default
          }
        }

      }
    }
  }
  return {...propsAttri}
}

export const convertToNumber=(str)=>{
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash=(hash * 31 + str.charCodeAt(i)) | 0
  }
  return hash
}
export const ComponentProps=(some,message,name)=>{

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