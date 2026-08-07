---
name: JSX generics break Replit metadata babel plugin
description: Vite dev overlay "Unexpected token" caused by <Component<Type>> syntax in .tsx files
---
The Replit dev tooling injects `data-replit-metadata`/`data-component-name` attributes into JSX opening tags before any explicit type argument, turning `<DetailDataTable<Row>` into invalid syntax and crashing vite:react-babel with "Unexpected token".

**Why:** the attribute injector doesn't understand JSX generic type arguments.

**How to apply:** never write explicit generic type arguments on JSX elements in web artifacts (`<Comp<T> ...>`); rely on prop inference or type the props variable instead. When this overlay error appears, search with `grep -rnE "<[A-Z][A-Za-z0-9]*<" --include=*.tsx` and strip the generics.
