
export const ComponentProps=(some,message)=>{
    
    return({
    Array:()=>{

        if (Array.isArray(some)) {
            return true
        }else{
            throw new Error(message ?message + ' / Not type of an Array ': `${some} must be an array`);
            
        }
    },
    String:()=>{
        if (typeof some === 'string') {
            return true
        }else{
            throw new Error(message? message + ' / Not type of a String' :`${some} must be a string`);
            
        }
    },
    Number:()=>{
        if (typeof some === 'number') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Number ': `${some} must be a number`);
            
        }
    },
    Object:()=>{
        if (typeof some === 'object') {
            return true
        }else{
            throw new Error(message? message+' / Not type of an Object ' :`${some} must be an object`);
            
        }
    },
    Function:()=>{
        if (typeof some === 'function') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Function ': `${some} must be a function`);
            
        }
    },
    Boolean:()=>{
        if (typeof some === 'boolean') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Boolean ' :`${some} must be a Boolean`);
            
        }
    },
})

}