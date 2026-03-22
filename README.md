# Lagoon Command Generator

[![Test](https://github.com/drevops/lagoon-commands/actions/workflows/test.yml/badge.svg)](https://github.com/drevops/lagoon-commands/actions/workflows/test.yml)

Single-page HTML application that generates ready-to-use Lagoon CLI commands
with project-specific values pre-filled.

## What it does

Enter your project name and settings once — get every Lagoon command you need
with all values substituted and ready to copy-paste.

## Features

- **Flat searchable list** — all commands visible, filterable by text search
  or clickable tag pills
- **Visual grouping** — commands grouped by category with group headers
- **Environment selector** — choose Production, Development, Custom branch,
  or PR environment per command
- **Inline controls** — setup commands have checkboxes, number inputs, and text
  fields directly in the card (branch patterns, env limit, PR deploy toggle,
  auto-idle)
- **DB override** — checkbox wraps deploy commands with `VORTEX_PROVISION_OVERRIDE_DB`
  variable set/remove
- **Dual SSH commands** — Lagoon CLI and direct SSH shown together
- **Custom SSH key** — optional per-project SSH key pattern with resolved
  preview and keygen command
- **Project autocomplete** — saved projects stored in localStorage with
  autocomplete dropdown
- **Global settings** — default production/dev branches, PR prefix, and SSH key
  pattern shared across projects
- **Config import/export** — transfer settings between browsers via JSON
- **URL query parameters** — pre-fill settings via URL
- **Share link** — copies a URL with current settings to clipboard
- **Regex validation** — branch pattern regex validated on every change
- **Custom command** — run any Lagoon command with the project pre-filled

## Supported query parameters

| Parameter      | Description                  | Default     |
|----------------|------------------------------|-------------|
| `project`      | Project name                 | _(empty)_   |
| `ssh_pattern`  | SSH key path pattern         | _(global)_  |
| `prod_branch`  | Production branch name       | `main`      |
| `dev_branch`   | Development branch name      | `develop`   |
| `github_repo`  | GitHub repository (org/name) | _(empty)_   |
| `pr_prefix`    | PR environment prefix        | `pr-`       |
| `tag`          | Pre-filter by tag            | _(none)_    |
| `search`       | Pre-fill search query        | _(none)_    |

## Command categories

| Tag        | Commands                                                          |
|------------|-------------------------------------------------------------------|
| auth       | Login, whoami, list variables, get project key                    |
| setup      | Branches, PR deploy, env limit, auto-idle, prod env, Shield, package token |
| variables  | Shield user/pass, GitHub token, package token, debug mode         |
| deploy     | Deploy branch, redeploy latest (with optional DB override)        |
| ssh        | SSH to environment (Lagoon CLI + direct SSH)                      |
| data       | Copy DB from/to environment, sync files up/down via rsync         |
| users      | Add/delete user, add user to group/project group                  |
| custom     | Run any custom Lagoon command                                     |

## Tech stack

- Single HTML file, no build step
- Water.css (dark theme) from CDN
- Plain JavaScript, no frameworks
- Playwright tests
- ESLint + Stylelint
