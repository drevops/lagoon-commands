# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page HTML application that generates ready-to-use Lagoon CLI commands with project-specific values pre-filled. No build step, no framework — one `index.html` file (~1100 lines) using Water.css (dark theme) from CDN and plain JavaScript.

## Architecture

Everything lives in `index.html`:
- **CSS** — custom properties for tag colours, settings panel, search bar, command cards, copy buttons, inline controls
- **HTML** — settings panel, search/filter bar, tag filter pills, export variables block, command cards container
- **JavaScript** — command definitions array, rendering, filtering (text search + tag pills), localStorage persistence, URL query parameter pre-fill, share link generation, regex validation for branch patterns, copy-to-clipboard

Commands are defined as data objects with `title`, `cmd`, `tags`, and optional inline controls (checkboxes, inputs). The render loop builds cards, substitutes `$PROJECT_NAME` etc., and wires up copy buttons.

## Development

Open `index.html` in a browser. No server, build, or install needed.

## Query Parameters

`?project=X&ssh_pattern=X&prod_branch=X&dev_branch=X&github_repo=X&ssh_port=X&tag=X&search=X`
