# CLAUDE.md — AI Assistant Guide for MusicWorld26

## Repository Overview

**MusicWorld26** is a music-related project. This repository is in its initial stage of development.

- **Owner**: mikejs2001
- **Repo**: [github.com/mikejs2001/MusicWorld26](https://github.com/mikejs2001/MusicWorld26)

## Project Status

The **EvoLife** mobile game is in active development. Initial scaffolding and core gameplay loop are complete.

### EvoLife — Game Concept
A mobile evolution simulation game where the player starts with a simple life form (🦠) and selects real-life or fantasy challenges (find food, escape predators, survive ice ages, develop language, reach space...). The creature attempts each challenge through an animated try/fail/succeed sequence. Successes accumulate evolution points, and once enough are earned the creature evolves into the next life stage. The game spans 11 evolution stages from primordial microbe to cosmic being.

## Tech Stack

- **Framework**: React Native via [Expo](https://expo.dev/) (blank TypeScript template)
- **Navigation**: Phase-based state machine (no external router; `GameContext` controls which screen renders)
- **State Management**: React Context + `useReducer` (`src/context/GameContext.tsx`)
- **Animations**: React Native `Animated` API
- **Gradients**: `expo-linear-gradient`
- **Language**: TypeScript

## Project Structure

```
evolife/
├── App.tsx                            # Root — mounts GameProvider + GameNavigator
├── src/
│   ├── context/
│   │   └── GameContext.tsx            # Global game state (phase, stage, points, results)
│   ├── data/
│   │   ├── creatures.ts               # 11 evolution stages with emoji and descriptions
│   │   └── challenges.ts              # 18+ challenges across 6 categories + fantasy
│   ├── components/
│   │   └── EvolutionBar.tsx           # Animated progress bar component
│   └── screens/
│       ├── HomeScreen.tsx             # Creature display + evolution progress
│       ├── ChallengeSelectScreen.tsx  # Pick up to 3 trials per round
│       ├── EvolutionSceneScreen.tsx   # Animated try/fail/succeed sequence
│       ├── ResultScreen.tsx           # Round summary + evolve trigger
│       └── EvolvedScreen.tsx          # Evolution celebration + lineage display
└── package.json
```

## Build & Run

```bash
cd evolife
npm install
npm run android   # or: npm run ios / npm run web
```

Requires the [Expo Go](https://expo.dev/go) app on your mobile device, or an Android/iOS emulator.

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

- **Tech Stack**: Languages, frameworks, and major dependencies.
- **Project Structure**: Directory layout and what each folder contains.
- **Build & Run**: Commands to build, run, and test the project.
- **Environment Setup**: Prerequisites, environment variables, and configuration.
- **Testing**: How to run tests, testing conventions, and coverage requirements.
- **Linting & Formatting**: Tools used and how to run them.
- **Architecture**: Key design patterns, data flow, and component relationships.
- **API Reference**: Endpoints, schemas, or interfaces if applicable.
