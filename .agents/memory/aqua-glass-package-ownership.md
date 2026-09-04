---
name: Aqua Glass package ownership
description: Prevent duplicate workspace-package ownership from breaking Aqua Glass imports and Publish builds.
---

`@workspace/aqua-glass` must be owned only by the Aqua Glass design-system artifact. Do not recreate a library stub with the same package name.

**Why:** pnpm can resolve consumers to the duplicate stub instead of the active design-system artifact. The resulting lockfile points dashboards at the wrong workspace path, and builds fail when the stub disappears or lacks the artifact's exports.

**How to apply:** When Aqua Glass imports stop resolving, check for duplicate package names across the workspace before changing application imports. Regenerate workspace links and the lockfile after removing any obsolete duplicate.