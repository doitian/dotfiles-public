# Install Compound Engineering Workflow

Install compound-engineering workflow for Cursor and OpenCode.

Create a temporary shallow clone of https://github.com/EveryInc/compound-engineering-plugin.git

## Install Location

- `ai/workflows/compound-engineering/skills`: all skills
- `ai/workflows/compound-engineering/agents`: agents definitions. No nested directory hierarchy.
- `ai/workflows/compound-engineering/commands`: commands definitions.

## Pruning

Extract minimum set of skills, agents, and comments according to the requirements below:

- Copy the command `/workflows/compound` and rename it to `/compound-docs`.
- Add skills, agents, and commands dependencies recursively.
- Exclude agents `lint`
- Exclude skills, agents, and commands for Rails only.
- Delete contents specific for Rails only.
- Review extracted skills, agents, and commands