# Repository instructions

Follow the shared conventions at
https://github.com/vhco-pro/docs/blob/1edeb5f32d868bbe761ef3221f350634cd6ff022/AGENTS.md.
Read conventions/coding.md, conventions/php.md, conventions/feature-documents.md,
conventions/delivery.md, conventions/repository-security.md and knowledge/shared-delivery.md
for this component. Read conventions/documentation.md and guides/humanize-prose.md for prose.

Feature documents: docs/specs/

This repository owns the reusable PHP CI composite action requested by the owner.
It uses free pipeline tools and follows the existing go-ci-action and worker-ci-action structure.
Consumer-specific platform setup and native integration tests belong in consumers.
Keep substantial logic in versioned scripts and tool settings in their owning configuration.
Use Apache-2.0 for this shared component under VH & Co BV.

The accepted PHP CI implementation is on its claimed feature branch.
For TypeScript scripts and tests, also read conventions/typescript.md at the pinned revision.
Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint` and `bun run test`.
Integration CI verifies the real composite, free scanners and shared GitVersion dry run.
Credentials and runtime evidence remain outside source Git.
The owner authorizes prompt documentation-only branch pushes. Merge and release need their own approval.
