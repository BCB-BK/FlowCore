---
name: New @workspace/db schema export not seen by tsc
description: tsc reports "has no exported member" for a brand-new drizzle schema export even though the source file and index.ts re-export look correct.
---

`lib/db` is a composite TypeScript project (`"composite": true`,
`emitDeclarationOnly`) and is consumed by other packages (e.g.
`artifacts/api-server`) via TS project references. With project references +
composite, `tsc` redirects imports to the referenced project's **compiled
`.d.ts` output** (`lib/db/dist/schema/*.d.ts`) rather than re-reading the
`.ts` source on every check — even though the package.json `exports` map
points at the source files and module *resolution* traces show the source
path being picked.

**Why:** This is TS's default project-reference declaration redirect
behavior; `moduleResolution: bundler` resolving to the source path doesn't
override it. Adding a new export to a schema file's source therefore has no
effect on downstream typechecks until the referenced project's declarations
are regenerated.

**How to apply:** After adding/renaming an export in `lib/db/src/schema/*`
(or any other composite referenced package), run `npx tsc -b tsconfig.json`
inside that package (e.g. `lib/db`) to regenerate `dist/**/*.d.ts` before
typechecking or running consumers. A plain `tsc --noEmit` in the consumer
package will keep failing with a misleading "has no exported member" error
otherwise, even though the source is correct.
