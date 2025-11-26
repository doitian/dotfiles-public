# Git Commit

Create a git commit with generated message from the staged diff. Analyze the following to generate the commit:

- `git diff --staged` (primary input). If the diff lacks sufficient context to understand intent, examine the full file.
- `git status --short` (change overview)  
- `git branch --show-current` (ticket/feature context)
- `git log --oneline -n 5` (style reference)

## Format

```
<type>(<scope>): <subject>

<body>
```

## Type (required)

Choose ONE based on the primary change:

- **feat**: New feature or capability
- **fix**: Bug fix
- **refactor**: Code restructuring without behavior change
- **perf**: Performance improvement
- **docs**: Documentation only
- **style**: Formatting, whitespace, semicolons (no logic change)
- **test**: Adding/updating tests
- **build**: Build system, dependencies, tooling
- **ci**: CI/CD configuration
- **chore**: Maintenance tasks, version bumps

## Scope (optional)

Short identifier for the affected area: `feat(auth):`, `fix(api):`, `docs(readme):`

## Subject line

- Max 72 characters
- Imperative mood: "add" not "adds" or "added"
- No period at end
- Lowercase after type

## Body

- Separate from subject with blank line
- Wrap at 72 characters
- Explain **what** and **why**, not how (code shows how)
- Use bullet points for multiple changes
- Keep bullets concise (1-2 lines each)
- Max 3-4 bullets for focused commits

## Rules

1. Never start with "This commit..."
2. Present tense throughout
3. Focus on intent and impact over mechanics
4. Group related changes; suggest splitting unrelated changes
5. For breaking changes: add `!` after type/scope and explain in body

## Example

```
feat(parser): add support for nested markdown lists

- Handle arbitrary nesting depth with recursive descent
- Preserve indentation context for proper rendering
- Add fallback for malformed input
```
