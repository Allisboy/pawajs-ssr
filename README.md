# PawaJS SSR

[![NPM Version](https://img.shields.io/npm/v/pawa-ssr.svg)](https://www.npmjs.com/package/pawa-ssr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**PawaJS SSR** is a powerful library for Server-Side Rendering (SSR) your [PawaJS](https://github.com/Allisboy/pawajs) applications. It allows you to execute PawaJS components, directives, and data-binding on a Node.js server, delivering fully-rendered HTML to the client. This improves initial page load performance and is essential for SEO.

## Key Features

-   **Full PawaJS Compatibility:** Renders components and templates using the same PawaJS syntax you use on the client.
-   **Server-Side Hooks:** Supports server-side implementations of PawaJS hooks like `$state`, `useInsert`, `setContext`, and `useContext`.
-   **Built-in Directives:** Includes powerful control-flow directives like `if`, `for-each`, `switch`, and `key`.
-   **Automatic Hydration:** Embeds necessary data for the client-side PawaJS to "hydrate" the static HTML and make it interactive without a full re-render using [PawaJS-Continue](https://github.com/Allisboy/pawajs-continue) library.
-   **Client-Only Escape Hatch:** Use the `only-client` attribute to prevent specific components or elements from rendering on the server.
-   **Extensible Plugin System:** Add your own custom directives and rendering lifecycle hooks.

## Installation

```bash
npm install pawa-ssr pawajs
```

## Quick Start

Here's a basic example of how to render a PawaJS component on the server using an Express.js server.

**1. Define your PawaJS Component (`src/app.js`)**

```javascript
import { RegisterComponent, $state, useInsert, html } from 'pawajs';
import {isServer} from 'pawajs/server'
import { initiateResumer } from "pawajs-continue";

const App = () => {
    const message = $state('World');
    useInsert({ message });

    return html`
        <div>
            <h1>Hello, @{message.value}!</h1>
            <p>This was rendered on the server.</p>
        </div>
    `;
};
RegisterComponent(App);
```
**2. A server file (`main.js`)
```javascript
import { startApp } from "pawajs-ssr";
import { App } from "./app.js";
import {App} from "./app.js"
 const Entry=()=>{
    return html`
    <div>
        <app></app>
    </div>
    `
}

export const main=async({url})=>{
    const template=Entry()
    const {toString,head}=await startApp(template,{url},true)//template string, context for server , true - for development
    const html=await toString()
    return {html,head}
}


```

**3. Create your Server Entrypoint (`server.js`)**

```javascript
import express from 'express';
import { startApp } from 'pawa-ssr';
import { Main } from './src/app.js'; // Import your component

const app = express();
const port = 3000;

app.get('/', async (req, res) => {
    try {
        // Get the component's HTML string
        const {html,head} =async Main({url:req.origin});
        const 

        const renderedHtml = await toString();

        // Inject into a full HTML document
        const finalHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>PawaJS SSR</title>
                ${head}
            </head>
            <body>
                <div id="app">${html}</div>
                <!-- Add client-side script for continuity using pawajs-continue library-->
                <script src="/app.js" type="module"></script>
            </body>
            </html>
        `;

        res.status(200).set({ 'Content-Type': 'text/html' }).send(finalHtml);

    } catch (e) {
        console.error(e.stack);
        res.status(500).send(e.stack);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
```

**3. Create the Client-side Hydration Script (`client.js`)**

This script will take over the server-rendered HTML.

```javascript
import { pawaStartApp, RegisterComponent } from 'pawajs';
import { initiateResumer } from 'pawajs-continue'; // Make sure this path is correct
import { App } from './src/app.js';

// Register the same components used on the server
RegisterComponent(App);

if(!isServer()){
    // Initialize the resumer for hydration
    initiateResumer();
    
    // Start PawaJS on the client to continue the app know as Continue Rendering Model(CRM)
    const appElement = document.getElementById('app');
    pawaStartApp(appElement);
}
```

## Core Concepts

### Directives

PawaJS SSR supports several built-in directives for declarative rendering.

#### `if` / `else-if` / `else`

Conditionally render blocks of HTML.

```html
<div if="user.value.isLoggedIn">
    Welcome, @{user.name}!
</div>
<div else-if="user.value.isGuest">
    Please sign up.
</div>
<div else>
    Please log in.
</div>
```

#### `for-each`

Render a list of items from an array. The syntax is `item, [index] in array`.

```html
<ul>
    <li for-each="item, i in items.value">
        @{i}: @{item.name}
    </li>
</ul>
```

#### `switch` / `case` / `default`

Handle more complex conditional logic based on a value.

```html
    <div switch="user.value.role" case="'admin'">
        <p>Admin Panel</p>
    </div>
    <div case="'editor'">
        <p>Content Editor</p>
    </div>
    <div default>
        <p>Standard User View</p>
    </div>
```

### Data Binding

Use the `@{...}` syntax to embed JavaScript expressions directly into your HTML text content and attributes.

```html
<h1 class="title-@{theme.value}">@{ pageTitle.value.toUpperCase() }</h1>
<button disabled="@{!form.value.isValid}">Submit</button>
```

### Components

Define reusable UI with PawaJS components. They are just functions that return an HTML string. Use `RegisterComponent` to make them available for rendering.

```javascript
import { RegisterComponent, html } from 'pawajs';

const MyButton = ({ children }) => {
    return html`<button class="my-btn" -- >${children}</button>`;
};

RegisterComponent(MyButton);

// Use it in another component
const App = () => {
    return html`
        <div>
            <my-button>Click Me</my-button>
        </div>
    `;
};
```

### Server Hooks

PawaJS SSR provides server-side implementations for common PawaJS hooks.

-   `$state(initialValue)`: Creates a state object. On the server, it's evaluated once.
-   `useInsert({ ... })`: Injects variables into the component's rendering context.
-   `useServer()`: When called within a component, it signals to the SSR engine to serialize the data injected via `useInsert` for client-side hydration.
-   `setContext()` / `useContext()`: Create and consume context that can be passed down the component tree.

### Client-Only Rendering

To prevent a component or element from being rendered on the server, add the `only-client` attribute. It will be rendered as a `<template>` tag and processed only by the client-side PawaJS.

```html
<div>
    <p>This is rendered on the server.</p>
    
    <!-- This chart component will only render on the client -->
    <heavy-chart-component only-client></heavy-chart-component>
</div>
```

## API

### `startApp(html, context, isDevelopment)`

The main function to start the SSR process.

-   `html` (string): The root HTML string of your application (e.g., `<app></app>`).
-   `context` (object): An initial global context object available to all components.
-   `isDevelopment` (boolean): A flag for development-specific logging.

**Returns:** An object with:
-   `toString()`: An async function that returns the fully rendered HTML string.
-   `head`: A string containing the content of the `<head>` tag if it was present in the input HTML.

## License

This project is licensed under the MIT License.