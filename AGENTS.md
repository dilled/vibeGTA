<!-- BEGIN brain.md -->
## Project Brain

This project keeps a **Project Brain**: a persistent memory layer of its durable decisions, requirements, and constraints. Read `./BRAIN.md` for the full read/write contract.

The `brain` CLI is not guaranteed to be on `PATH`. From the project root, invoke it as `node <brain-page-skill-dir>/bin/brain.mjs <subcommand> [flags]`, resolving `<brain-page-skill-dir>` to the installed `brain-page` skill directory.

Maintain the brain as part of normal coding work — not as a separate task. While discussing or implementing features:
- **Start of a task:** load relevant context with the `brain` CLI (`list-pages`, `read-page`, `read-root`). Prefer a narrow read over scanning everything.
- **When a decision, requirement, constraint, or durable insight settles** (in chat or while coding): capture it immediately via the `brain` CLI. Do not wait to be asked and do not batch it for later.
- **Pure implementation with no new decision:** do not write to the brain.
- **When overturning a prior conclusion:** update the page (`update-truth` and/or `append-timeline` with `kind: reversal`, or `archive-page`).
- Only store what will still matter in six months and is hard to reconstruct from the code alone.
- Never hand-edit brain files. If a brain MCP server is connected and authenticated, prefer it; otherwise use the `brain` CLI.

The brain skills (`brain-setup`, `brain-page`, `brain-ingest`, `brain-bootstrap`) are installed in your global skills directory. To scaffold a new project, run `node <brain-page-skill-dir>/bin/brain.mjs init` from its root.

If native notes/history are available, keep relevant brain page IDs and unresolved task state in notes; search history for earlier task evidence. After context rollover, re-read relevant pages through the CLI for current project facts. Do not copy task history into the brain.
<!-- END brain.md -->
<!-- BEGIN graphify -->
## Code Graph

This project uses Graphify as a structural index of the current codebase.

Use Graphify to understand code structure, dependencies, impact, and relevant
implementation before loading large amounts of source code into context.

- Prefer targeted Graphify queries over reading many source files.
- Treat source code as the source of truth if the graph and working tree disagree.
- Do not load `graphify-out/graph.json` into the model context.

### Keeping the graph current

- Git hooks may update the graph automatically after commits and checkouts.
- After substantial structural changes made during a task, run:

  `graphify update .`

- After `git pull`, merge, rebase, or another operation that changes substantial
  parts of the codebase, run:

  `graphify update .`

- After a large refactor that deletes or removes significant code, use:

  `graphify update . --force`

- Small implementation edits do not require an immediate refresh.

### Relationship with Project Brain

- Brain stores durable decisions, requirements, constraints, and knowledge that
  is difficult to reconstruct from source code.
- Graphify represents the current structure and relationships of the codebase.
- Do not copy ordinary implementation details from Graphify into Brain.
- Update Brain when a durable architectural or project decision changes.
- Update Graphify when the code structure changes substantially.
<!-- END graphify -->
<!-- BEGIN tokenix -->
## Token-efficient source retrieval

Prefer Tokenix for targeted source retrieval when it can answer the question
without loading entire files or large command outputs.

- Use Tokenix to retrieve the smallest relevant source context.
- Use Graphify for architectural relationships, dependency traversal, and impact analysis.
- Use Brain for durable project decisions and constraints.
- Do not scan large parts of the repository when Tokenix can retrieve the relevant symbols or code chunks directly.
<!-- END tokenix -->
