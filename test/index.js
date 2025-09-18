const pawa=require('../index.js')

const component=({app})=>{
    const user=false
    const array=['john','peace','james']
    app.insert({user,array})
    return `
        <div>
            <h1 -->
                <span>Hello World</span>
                <span s-if="users">Allwell</span>
                <span s-else>@(man.value)</span>
            </h1> 
            <div s-for="items in array" s-pawa-avoid>
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
const newHtml=pawa.startApp(html(),{},true)
console.log(newHtml.toString())