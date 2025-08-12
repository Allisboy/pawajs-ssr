# pawajs-ssr 
pawajs ssr (server side rendering) for javascript

# Directives
server-for, server-if,server-else,server-else-if

```html
<div s-if="user.value.name">
    <h1>@(user.value.name)</h1>
</div>
```
* or
#javascript
```javascript
const pawa=require('../index.js')

const component=({app})=>{
    const user=false
    const array=['john','peace','james']
    app.insert({user,array})
    return `
        <div>
            <h1>
                <span>Hello World</span>
                <span s-if="user">Allwell</span>
                <span s-else>Login</span>
            </h1> 
            <div s-for="items in array">
                <span>@(items)</span>
            </div>       
        </div>
        `
}
pawa.RegisterComponent(component)
const html=()=>{
    return `
        <div>
            <component></component>
        </div>
    `
}
const newHtml=pawa.startApp(html())
```
* Notice pawajs ssr uses @() instead of @{} and pawajs ssr doesn't use client's hooks
# MIT LICENSE