export const resolver=async(str,item)=>{
    if (item?.awaits) {
        await awaitResolver({str,...item})
    }else{
        await awaitStateResolver(str,item)
    }
}
const awaitStateResolver=async(str,item)=>{
    const promises=item.promise
    const id=item.id
    const res=await Promise.allSettled(promises.map(async m =>{
        try {
           const re= await m.promise
            return {success:re, name:m.name}
        } catch (error) {
            return {error:error,name:m.name}
        }
    }))
    const chunk=`
    <script id="${id}">
    (() => {
        const result=${JSON.stringify(res)}
        if (Array.isArray(window.states?.['${id}'])) {
            const setup=window.states['${id}']
                setup.forEach(f => f(result))
        } else {
            window.awaits['${id}']=result
        }
    })()
            </script>
            `
            str(chunk)
}
const awaitResolver=async({awaits,awaitError,promise,context,graph,client,componentGraph,id,str,render,setRender,setComponentGraph,hydrate:parent})=>{
    const newContext={
        ...context,
    }
    const newStream=(html)=>{
        chunk+=html
    }
    let chunk = ''
    try {
        const res=await promise()
        const as=awaits.getAttribute('as') || 'res'
        awaits.removeAttribute('await')
        newContext[as]=res
        
        const send={[as]:res}
        const hydrate={
            resolved:true,
            type:'await',
            context:client?send:null,
            id:id,
            ref:'',
            children:[]
        }
        if (parent?.forkey) {
            hydrate.forkey=parent.forkey
        }
        setRender(newContext,hydrate,newStream)
        newStream(`<div hidden stream-id="${id}" p:id="${id}">`)
        setComponentGraph(componentGraph)
        await render(awaits)
        newStream('</div>')
        
        newStream(`
            <script>
            (() => {
                const hydrate=${JSON.stringify(hydrate)}
                if(window.awaits?.['${id}']){
                    const run=window.awaits['${id}']
                    run(hydrate,true)
                }else{
                    window.awaits['${id}']=hydrate
                }
            })()
            </script>`)
        str(chunk);
        
    } catch (error) {
        if (awaitError) {
        const as=awaitError.getAttribute('as') || 'error'
        awaitError.removeAttribute('as-catch')
        const send={[as]:error}
        const hydrate={
            resolved:true,
            type:'await',
            context:client?send:null,
            id:id,
            ref:'',
            children:[]
        }
        if (parent?.forkey) {
            hydrate.forkey=parent.forkey
        }
        newContext[as]=error
        setRender(newContext,hydrate,newStream)
        newStream(`<div hidden stream-id="${id}" p:id="${id}">`)
        setComponentGraph(componentGraph)
        await render(awaitError)
        newStream('</div>')
        
        newStream(`
            <script>
            (() => {
                const hydrate=${JSON.stringify(hydrate)}
                if(window.awaits?.['${id}']){
                    const run=window.awaits['${id}']
                    run(hydrate,true)
                }else{
                    window.awaits['${id}']=hydrate
                }
            })()
            </script>`)
        str(chunk);
        }
    }
}