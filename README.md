# pi-config

Personal [pi](https://github.com/badlogic/pi) extensions and skills.

## Contents

### Extensions

- **prompt-stash** — Stash/unstash prompts with `Alt+S` / `Alt+Z`. Like `git stash` but for your editor text.

### Skills

- **git-commit-and-push** — Commit and push changes on a feature branch, with PR/MR creation. Supports GitButler and standard git workflows.

## Install

```bash
pi install git:github.com/sttwister/pi-config
```

## Usage

### Prompt Stash

| Shortcut / Command | Description |
|---------------------|-------------|
| `Alt+S` | Stash current editor text |
| `Alt+Z` | Pop last stashed prompt back into editor |
| `/unstash` | Pop last stashed prompt (when editor is empty) |
| `/stash-list` | Show all stashed prompts |
| `/stash-clear` | Clear the stash |

### Git Commit and Push

Use `/git-commit-and-push` or ask the agent to commit and push your changes.
