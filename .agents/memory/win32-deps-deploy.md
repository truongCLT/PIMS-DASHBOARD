---
name: Windows-only deps break publish
description: Windows-only platform binaries in root package.json make the Linux publish build fail with npm EBADPLATFORM
---

Rule: never allow platform-restricted binary packages (e.g. `@esbuild/win32-x64`, `@rollup/rollup-win32-x64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`, `lightningcss-win32-x64-msvc`) as direct dependencies in any package.json of this monorepo.

**Why:** A collaborator working on a Windows PC added them; the Replit publish build runs `npm install` on Linux, which hard-fails with `EBADPLATFORM` on os-restricted deps (build 2026-08-07). Parent packages (esbuild, rollup, tailwind oxide, lightningcss) pull the correct platform binary automatically via optionalDependencies.

**How to apply:** If a deploy build fails at "Installing packages" with EBADPLATFORM, grep package.json files for `win32`/`-msvc`/`darwin` direct deps, remove them, and run `pnpm install --lockfile-only`. A guard task was proposed to automate this check.

**Dual lock-file trap:** If both `package-lock.json` and `pnpm-lock.yaml` coexist at the repo root, the Replit publish build uses `npm install` (reading `package-lock.json`), bypassing pnpm and its platform exclusions. Symptom: build fails within ~12 seconds with almost no log output. Fix: delete `package-lock.json` so only `pnpm-lock.yaml` remains.
