export const App=({children})=>{
    return `<div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Hello, World!</h1>
        <p class="text-gray-700">This is a test component for PawaJS.</p>
        <div>
            ${children}
        </div>
    </div>`
}