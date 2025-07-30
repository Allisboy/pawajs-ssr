# pawajs-ssr 
pawajs ssr (server side rendering) for javascript

# Directives
server-for, server-if,server-else,server-else-if

```html
<div server-if="user.value.name">
    <h1>@(user.value.name)</h1>
</div>
```

* Notice pawajs ssr uses @() instead of @{} and pawajs ssr doesn't use client's hooks
