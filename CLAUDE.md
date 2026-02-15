# CLAUDE.md — AI Assistant Guide for MusicWorld26

## Repository Overview

**MusicWorld26** is a music-related project. This repository is in its initial stage of development.

- **Owner**: mikejs2001
- **Repo**: [github.com/mikejs2001/MusicWorld26](https://github.com/mikejs2001/MusicWorld26)

## Project Status

This project uses Node.js to build a music library and playlist manager.

## Tech Stack

- **Language**: JavaScript (Node.js)
- **Testing**: Node.js built-in test runner (`node --test`)

## Project Structure

```
src/
  index.js          # Entry point — demo of playlist functionality
  playlist.js       # Playlist class (add, remove, list tracks)
  playlist.test.js  # Tests for the Playlist class
```

## Build & Run

```bash
# Run the application
npm start

# Run tests
npm test
```

## Development Workflow

### Branch Strategy

- The default branch should be `main`.
- Feature branches should use descriptive names (e.g., `feature/add-playlist-support`).
- All changes should go through pull requests before merging to `main`.

### Commits

- Write clear, descriptive commit messages.
- Use conventional commit style when possible (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).

## Conventions for AI Assistants

### General Guidelines

- Read existing code before proposing changes. Understand context first.
- Keep changes minimal and focused — avoid over-engineering.
- Do not add unnecessary comments, docstrings, or type annotations to code you did not change.
- Prefer editing existing files over creating new ones.
- Do not introduce security vulnerabilities (XSS, injection, etc.).

### When This File Should Be Updated

Update this CLAUDE.md whenever:

- A framework or language is chosen for the project.
- Build tools, linters, or formatters are configured.
- Testing infrastructure is set up.
- New directory structure conventions are established.
- CI/CD pipelines are added.
- Environment setup requirements change.

### Sections to Add as the Project Grows

As the codebase develops, expand this file with:

- **Environment Setup**: Prerequisites, environment variables, and configuration.
- **Linting & Formatting**: Tools used and how to run them.
- **Architecture**: Key design patterns, data flow, and component relationships.
- **API Reference**: Endpoints, schemas, or interfaces if applicable.
