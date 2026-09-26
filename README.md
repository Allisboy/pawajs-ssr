# PawaJS SSR

PawaJS SSR renders PawaJS markup on the server and returns both HTML and a hydration tree. The browser can pass that tree to [`pawajs-continue`](https://github.com/Allisboy/pawajs-continue) to resume the server-rendered DOM.

## Install

```bash
npm install pawa-ssr pawajs pawajs-continue
```

## Server rendering

Register the same components that the browser will use, then create a server session with `pawaServer`. Call `render()` to get the HTML and hydration data.

```js
import { RegisterComponent, html } from 'pawajs';
import { pawaServer } from 'pawa-ssr';
import { App } from './App.js';

RegisterComponent(App);

const session = pawaServer(
  '<app></app>',
  { url: '/' },
  false, // streaming mode
  process.env.NODE_ENV !== 'production',
);

const { string: renderedHtml, hydrate } = await session.render();
```

`renderedHtml` contains the server-rendered markup. `hydrate` is the root hydration tree. Send both to the browser as part of the page response. For example, serialize the tree into a JSON script element:

```js
const hydrationJson = JSON.stringify(hydrate)
  .replace(/</g, '\\u003c');

const page = `<!doctype html>
<html>
  <body>
    <main id="app">${renderedHtml}</main>
    <script id="pawa-hydration" type="application/json">${hydrationJson}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;
```

Escaping `<` keeps serialized data from being interpreted as markup inside the script element.

### Resolve streamed work

After `render()`, call `batches(write)` to resolve queued asynchronous work. The callback receives chunks produced by the resolver; connect it to your response or stream destination when using the streaming flow.

```js
await session.batches((chunk) => response.write(chunk));
```

For a response that needs to include the final initial render as well, write `renderedHtml` before resolving batches. Follow your server framework's response lifecycle when deciding when to end the response.

## Client resumption

Register the same components in the client bundle. Read the hydration JSON and pass it to `PawaContinue`:

```js
import { RegisterComponent } from 'pawajs';
import { PawaContinue } from 'pawajs-continue';
import { App } from './App.js';

RegisterComponent(App);

const node = document.getElementById('pawa-hydration');
if (node?.textContent) {
  PawaContinue(node.textContent);
}
```

`PawaContinue` resumes the DOM and hydration tree. It accepts a JSON string.

## Rendering behavior

The renderer parses the supplied HTML with LinkeDOM, evaluates registered components and Pawajs directives, and writes the resulting markup through its rendering pipeline. The returned hydration tree records the serialized state and structural information needed by the client continuation package.

The current renderer handles conditional branches (`if`, `else-if`, `else`), keyed and repeated content (`key`, `for-each`), state blocks, templates, awaits, components, and text and attribute expressions. Use `only-client` on markup that should be deferred to the client; the server emits it in a template marker for continuation.

Pawajs hooks such as `$state`, `useInsert`, `setContext`, and `useContext` are connected to their server implementations when `pawa-ssr` is loaded.

## API

### `pawaServer(html?, context?, stream?, development?)`

Creates an SSR session for an HTML string. `context` is the initial rendering context. `stream` selects streaming behavior, and `development` controls development-mode server error reporting.

It returns:

- `render()`: asynchronously returns `{ string, hydrate }`.
- `batches(write)`: resolves queued asynchronous work and sends generated chunks to `write(chunk)`.
- `sendStripWarning(write?)`: emits the development warning for components omitted from server output, when enabled.

### `createServerRender(graph, contexts, stream, hydrates)`

Creates a lower-level renderer for a subtree. `graph` is a Pawajs `PawaGraph` parent or `null`; `contexts` supplies the render context; `stream` receives output chunks; and `hydrates` is the hydration node being populated. The result contains `renderGraph`, `render(element)`, and `setRender(context?, hydrate?, stream?)`.

### `setDevelopment(enabled?)` and `getDevelopment()`

Set and read the module's server development flag. In development mode, rendering errors are logged with their scope and rethrown.

## TypeScript

The package declaration imports `PawaGraph` from `pawajs` for the graph accepted by `createServerRender` and returned as `renderGraph`.

## License

MIT
