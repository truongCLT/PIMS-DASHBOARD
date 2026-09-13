---
name: Merge ancestry after checkpoints
description: Verifying Git merge history when automatic checkpoints run during conflict resolution.
---

After resolving a pull conflict, do not treat a clean worktree or missing `MERGE_HEAD` as proof that the remote branch was merged. Verify that the remote tip is an ancestor of `HEAD` and that the branch is no longer behind.

**Why:** An automatic checkpoint can commit the staged merge result as a normal single-parent commit before the manual merge commit runs. The files may contain the incoming changes while Git still considers the remote commits unmerged. LFS conflicts can also present one side as a pointer and the other as identical raw bytes.

**How to apply:** Fetch first, check `git merge-base --is-ancestor <remote> HEAD`, and inspect the latest commit parents. If a checkpoint already saved the fully resolved and validated tree, create a proper two-parent merge commit using that exact tree. For LFS pointer/raw conflicts, verify content SHA-256 equality before staging the canonical pointer.