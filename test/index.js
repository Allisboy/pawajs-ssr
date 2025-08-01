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
console.log(newHtml.toString())