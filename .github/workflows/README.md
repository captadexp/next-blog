# CI/CD Pipeline for next-blog

This CI/CD pipeline automatically handles versioning and publishing of the npm packages.

## How it works

The `npm-publish.yml` workflow will:

1. Run automatically when:
    - Changes are pushed to the `main` branch
    - The workflow is manually triggered

2. For each package (ui, dashboard, core), it will:
    - Run typechecks for code quality
    - Build the package
    - Increment the patch version (e.g., 1.0.0 → 1.0.1)
    - Publish to npm (requires NPM_TOKEN)

## Triggering specific package updates

You can control which packages get version bumped and published by using specific prefixes in your commit messages:

- `ui:` - Triggers update for the UI package
- `dashboard:` - Triggers update for the Dashboard package
- `core:` - Triggers update for the Core package

For example:

```
git commit -m "ui: fix button styling"
```

## Manual trigger

You can manually trigger the workflow from the GitHub Actions tab to publish all packages.

## Required secrets

- `NPM_TOKEN`: An npm access token with publish permissions