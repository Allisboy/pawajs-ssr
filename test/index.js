import {useValidateComponent, RegisterComponent,useContext,useInsert,setContext} from 'pawajs'
import {startApp} from '../index.js'
const auth=setContext()
const component=async({app,name})=>{
  auth.setValue({name:name()})
    const user=false
    const array=['john','peace','james']
    useInsert({user,array,name})
    return `
        <div>
            <h1 title="@{user ? name():'Guest'}" -->
                <span>@{name()}</span>
                <span if="user">Allwell</span>
                <span else>false</span>
            </h1> 
            <div s-for="items in array" s-pawa-avoid>
                <span>@{items}</span>
            </div> 
            <small-app></small-app>      
        </div>
        `
}
const SmallApp=()=>{
   const {name}=useContext(auth)
   useInsert({name})
    return /*html*/`
    <div state-count="0">
      <h1>Small App Component</h1>
      <span>@{name}</span>
      <h1>@{count.value}</h1>
      <new-app></new-app>
    </div>`
}
useValidateComponent(component,{
    name:{
        strict:true,
        type:String
    }
})
const NewApp=()=>{
  return
}
RegisterComponent(component,SmallApp,NewApp)
const html=()=>{
    return `
        <!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/pawajs.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>pawajs-template</title>
  </head>
  <body>
    <div id="app">
       <div>
         <component :name="'Allwell'"></component>
       </div>

    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
    `
}
const newHtml=await startApp(html(),{},true)
console.log(await newHtml.toString())