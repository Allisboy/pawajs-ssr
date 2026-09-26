# pawa-ssr

**Server-side rendering for PawaJS — with continuity, not hydration.**

`pawa-ssr` renders PawaJS markup on the server and produces two things: real, fully-resolved HTML, and a small JSON payload describing exactly what's reactive on the page. The browser hands both to [`pawajs-continue`](https://github.com/Allisboy/pawajs-continue), which **resumes** the page — attaching live reactivity to the DOM that's already there — instead of re-rendering and reconciling it from scratch the way traditional hydration does.

Together, this HTML + JSON contract is called **SCP** (Server Continuation Protocol). It's deliberately simple: plain HTML attributes marking structural boundaries, and a flat, id-keyed JSON object carrying only the state a construct actually needs to resume. No serialized closures, no framework-specific payload format — any backend language could, in principle, produce SCP-compliant output.

---

## Why this instead of hydration

Most SSR frameworks ship a payload sized to the whole component tree, then re-run the client-side render and diff it against what the server sent — real, recurring cost, whether or not a given piece of the page is actually interactive.

`pawa-ssr` asks a narrower question for every piece of the page: **did this actually touch reactive state?** If a component, expression, or prop never reads from a `$state` proxy, it contributes **nothing** to the JSON — no matter how large or deeply nested it is. A dashboard with dozens of components and a handful of genuinely reactive widgets produces a payload sized to those widgets, not to the dashboard.

What the client does with that payload is equally narrow: no re-render, no diffing pass. Each construct is looked up once by id and either seeded with server-resolved state (a resolved condition branch, a resolved promise, a component's props) or, for the rare cases that must re-run (a component re-executing to rebuild its own effects), attached directly to the existing element rather than replacing it.

---

## Install

```bash
npm install pawa-ssr pawajs pawajs-continue
```

`pawajs` is a peer dependency — register the exact same components on the server and in the client bundle, or SCP has nothing consistent to resume.

---

## Quick start

**Server**

```js
import { RegisterComponent } from 'pawajs';
import { pawaServer } from 'pawa-ssr';
import { App } from './App.js';

RegisterComponent(App);

const session = pawaServer(
  '<app></app>',        // the markup to render
  { url: '/' },          // initial render context
  false,                 // stream: false for a single-response render
  process.env.NODE_ENV !== 'production', // development: enables dev warnings
);

const { string: html, hydrate } = await session.render();
```

`html` is the fully-resolved markup. `hydrate` is the SCP payload — a plain object, ready to serialize.

**Send both to the browser**

```js
const hydrationJson = JSON.stringify(hydrate).replace(/</g, '\\u003c');

const page = `<!doctype html>
<html>
  <body>
    <main id="app">${html}</main>
    <script id="pawa-hydration" type="application/json">${hydrationJson}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;
```

Escaping `<` inside the serialized JSON keeps it from being misread as markup by the browser's HTML parser.

**Client — resume, don't hydrate**

```js
import { RegisterComponent } from 'pawajs';
import { PawaContinue } from 'pawajs-continue';
import { App } from './App.js';

RegisterComponent(App); // same components, same names

const node = document.getElementById('pawa-hydration');
if (node?.textContent) {
  PawaContinue(node.textContent);
}
```

`PawaContinue` takes the raw JSON string, walks it, and attaches live reactivity to the matching `p:id`-marked elements already in the DOM — no re-render happens.

---

## Streaming

For pages with slow-resolving `await`s, `pawa-ssr` can stream: the initial response ships immediately with placeholder content for whatever hasn't resolved yet, and each pending piece streams in — independently, as it settles — without blocking on the slowest one.

```js
const session = pawaServer('<app></app>', { url: '/' }, true /* stream */);

const { string: shellHtml, hydrate } = await session.render();
response.write(buildPage(shellHtml, hydrate)); // ships immediately

await session.batches((chunk) => response.write(chunk)); // streams in as things resolve
response.end();
```

Each streamed chunk carries its own resolved content and a small inline script that either calls a callback the client already registered (if the client's resumer reached that point first) or parks the resolved data for the client to pick up when it gets there — a small, order-independent handshake, so it never matters which side — server chunk or client walk — arrives first.

## Deferring content to the client entirely

Not everything needs to be server-rendered. Mark markup that's inherently client-only — a canvas widget, something that reads `window`, anything SSR would just show a placeholder for anyway — with `only-client`:

```html
<div only-client>
  <rich-text-editor></rich-text-editor>
</div>
```

The server never evaluates it; it's emitted as an inert `<template>` for the client to build fresh on attach. Zero SSR cost, zero JSON entry.

## When detection can't see it

`pawa-ssr` detects reactivity by watching for state reads during server evaluation — but calling a function during SSR never runs its body, so a function passed as a prop or event handler (something that reads state only once it's actually invoked, client-side) is invisible to that detection. Mark the usage site with `force` when you know a component needs client status for this reason:

```html
<my-widget :on-select="handleSelect" force></my-widget>
```

You only need `force` at the boundary where this is genuinely invisible to detection — components nested inside an already-client region don't need it repeated for every function-valued prop passed further down.

## Development warnings

With `development: true`, components that are structurally inside a client boundary but were correctly pruned from the payload (nothing in them touched reactive state) can be logged, so you can confirm the pruning decision was the one you expected rather than discovering it by a missing interaction in production:

```js
await session.sendStripWarning((chunk) => response.write(chunk));
```

This is informational, not an error — a component *should* be pruned if it genuinely has nothing reactive.

---

## API

### `pawaServer(html?, context?, stream?, development?)`

Creates an SSR session.

| Argument | Type | Description |
|---|---|---|
| `html` | `string` | The markup to render. |
| `context` | `object` | Initial render context (e.g. route params, request data). |
| `stream` | `boolean` | `false` for a single, complete response; `true` to enable chunked streaming for pending `await`s. |
| `development` | `boolean` | Enables development-mode error detail and the strip-component warning. |

Returns:

- **`render()`** → `Promise<{ string, hydrate }>`. `string` is the rendered HTML; `hydrate` is the SCP payload (a plain, JSON-serializable object).
- **`batches(write)`** → resolves any queued streamed work, calling `write(chunk)` for each resolved chunk as it settles. No-op if nothing was queued.
- **`sendStripWarning(write?)`** → emits the development-mode warning listing components pruned from the payload. Only sends anything when `development` was `true`.

### `createServerRender(graph, contexts, stream, hydrates)`

A lower-level entry point for rendering a subtree directly, if you need finer control than `pawaServer` gives you.

| Argument | Description |
|---|---|
| `graph` | A parent `PawaGraph` node, or `null` for a root render. |
| `contexts` | The render context for this subtree. |
| `stream` | A function called with each output chunk as it's produced. |
| `hydrates` | The hydration node this subtree's output should be recorded into. |

Returns `{ renderGraph, render(element), setRender(context?, hydrate?, stream?) }`.

### `setDevelopment(enabled?)` / `getDevelopment()`

Read or set the module-level development flag directly, outside of a `pawaServer(...)` call.

---

## What the renderer understands

`pawa-ssr` parses the given HTML with [LinkeDOM](https://github.com/WebReflection/linkedom) and evaluates it the same way the client does: `if` / `else-if` / `else`, `for-each` / `for-key`, `state-*`, `template`, `await` / `as-fallback` / `as-catch`, registered components, and `@{ }` text/attribute expressions. `$state`, `useInsert`, `setContext`, and `useContext` are all connected to their server-side implementations automatically once `pawa-ssr` is loaded — no separate setup needed in your component code.

---

## TypeScript

The package's type declarations import `PawaGraph` from `pawajs` for the graph type accepted by and returned from `createServerRender`.

---

## License

MIT