import { ElementProperty } from "pawajs/src/pawaElement.js";
import { getContexters, safeEval } from "pawajs/src/utils.js";
import { isProxy} from "../utils.js";


export const attribute = async (el,exp, context,graph) => {
  const { values } = getContexters(context);
  const attrMap = new Map();
  
  const isAtAttr = exp.name.startsWith("@");
  const targetName = isAtAttr ? exp.name.slice(1) : exp.name;

  if (isAtAttr) {
    el.removeAttribute(exp.name);
  }
  
  attrMap.set(exp.name, exp.value);
  const booleanAttributes = new Set([
    "checked",
    "selected",
    "disabled",
    "readonly",
    "required",
    "multiple",
  ]);

  try {
    let attrName = targetName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    let value = attrMap.get(exp.name);
    let isBoolean;
    const regex = /@{([^}]*)}/g;
    let reactive=false
    const hasExpression = regex.test(value);
    value = value.replace(regex,(match, expression) => {
      const {result,client} = isProxy(()=>safeEval(expression, context, true))
      // console.log(client,expression);
      if (!reactive) {
        reactive=client
      }
      // console.log(reactive,expression);
      
      // console.log(result,client,expression);
      
      isBoolean = result;
      if (typeof result !== "boolean") {
        return result ?? "";
      } else {
        return result ? "true" : "false";
      }
    });
if (reactive ) {
  el.setAttribute(`#${targetName}`,exp.value)
}    
    if (booleanAttributes.has(attrName)) {
      const boolValue = hasExpression
        ? !!isBoolean
        : value.toLowerCase() !== "false";
      const propName = attrName === "readonly" ? "readOnly" : attrName;

      if (boolValue) {
        el.setAttribute(targetName, value);
      } else {
        el.removeAttribute(targetName);
      }
    } else if (attrName === "value" && "value" in el) {
      el.setAttribute('value', value);
    } else if (exp.name.includes(".") || exp.name.includes("-")) {
      if (el.hasAttribute(exp.name)) el.removeAttribute(exp.name);
      ElementProperty(el, attrName, value);
    } else {
        el.setAttribute(targetName, value);
      }
    }
  catch (error) {}
};
