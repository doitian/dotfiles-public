---
name: crates-trusted-publishing
description: Add GitHub Actions workflow for publishing Rust crates using trusted publishing (OIDC). Use when setting up automated crate publishing, configuring crates.io trusted publishing, or when the user mentions crate publishing workflow.
disable-model-invocation: true
---

# Crates.io Trusted Publishing

Set up GitHub Actions workflow to publish Rust crates using OIDC-based trusted publishing instead of long-lived API tokens.

## Prerequisites

- Crate must already be published to crates.io (initial publish requires API token)
- You must be an owner of the crate on crates.io

## Setup Steps

### 1. Create the GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Publish to crates.io

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: release  # Optional: for enhanced security
    permissions:
      id-token: write  # Required for OIDC token exchange
    steps:
      - uses: actions/checkout@v4
      - uses: rust-lang/crates-io-auth-action@v1
        id: auth
      - run: cargo publish
        env:
          CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
```

### 2. Configure crates.io

Add a trusted publisher at: `https://crates.io/crates/<CRATE_NAME>/settings/new-trusted-publisher`

If the `cursor-ide-browser` MCP or the skill `agent-browser` is available, automate the trusted publisher setup:

1. Navigate to `https://crates.io/crates/<CRATE_NAME>/settings/new-trusted-publisher`
2. Fill in the repository owner, repository name, workflow filename, and environment
3. Submit the form

Note: The user must already be logged into crates.io in the browser.

## Workspace Crates

For workspaces with multiple crates, publish each crate separately:

```yaml
- run: cargo publish -p crate-name-1
  env:
    CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
- run: cargo publish -p crate-name-2
  env:
    CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
```

Add delays between publishes if crates depend on each other:

```yaml
- run: cargo publish -p core-crate
  env:
    CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
- run: sleep 30  # Wait for crates.io to index
- run: cargo publish -p dependent-crate
  env:
    CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}
```

## Reference

- [crates.io Trusted Publishing docs](https://crates.io/docs/trusted-publishing)