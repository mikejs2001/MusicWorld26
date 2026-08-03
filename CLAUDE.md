# CLAUDE.md — AI Assistant Guide for MusicWorld26

## Repository Overview

**MusicWorld26** is a music-related project. This repository is in its initial stage of development.

- **Owner**: mikejs2001
- **Repo**: [github.com/mikejs2001/MusicWorld26](https://github.com/mikejs2001/MusicWorld26)

## Project Status

The repository now contains a first application: a hair & beauty studio demo site under `salon/`. Root-level tooling, language, and framework choices for the rest of the repo have not yet been established.

## `salon/` — Hair & Beauty Demo Site

A mobile-first demo site for a fictional hair & beauty studio ("Lumière Hair & Beauty Studio"), including an in-browser AI chat assistant ("Lumi") that answers questions about services, products, and studio policies.

### Tech Stack

- **React 19 + TypeScript**, built with **Vite** (`salon/vite.config.ts`).
- **Tailwind CSS v4** via `@tailwindcss/vite` — theme tokens (colors, fonts, animations) are defined in `salon/src/index.css` under `@theme`, not a `tailwind.config.js`.
- **react-router-dom** for client-side routing (`salon/src/App.tsx`).
- No backend — all content lives in `salon/src/data/*.ts`. Forms (booking, contact) simulate submission client-side.

### Project Structure

- `salon/src/pages/` — one file per route (Home, Services, Products, Booking, About, Team, Gallery, Contact, NotFound).
- `salon/src/components/layout/` — Header (mobile hamburger nav) and Footer.
- `salon/src/components/ui/` — shared primitives (Button, SectionHeading, Accordion, Img, PageHeader, etc.).
- `salon/src/components/home/` — Home-page-only sections.
- `salon/src/components/chatbot/` — the "Lumi" AI assistant: `ChatWidget.tsx` (UI), `chatEngine.ts` (keyword-scoring matcher over services/products/team data), `knowledgeBase.ts` (curated policy/FAQ intents).
- `salon/src/data/` — services, products, team, testimonials, gallery, FAQs, and studio info (hours, address, etc.). Edit these to change site content.

### Images

Photos are hot-linked from Unsplash (`https://images.unsplash.com/photo-<id>`) via the `Img` component (`salon/src/components/ui/Img.tsx`), which falls back to a styled placeholder if a photo ID ever fails to load — always use `Img`/`PageHeader` rather than a raw `<img>` for content photography.

### Build & Run

```bash
cd salon
npm install
npm run dev      # local dev server
npm run build    # tsc -b && vite build
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

- **Tech Stack**: Languages, frameworks, and major dependencies.
- **Project Structure**: Directory layout and what each folder contains.
- **Build & Run**: Commands to build, run, and test the project.
- **Environment Setup**: Prerequisites, environment variables, and configuration.
- **Testing**: How to run tests, testing conventions, and coverage requirements.
- **Linting & Formatting**: Tools used and how to run them.
- **Architecture**: Key design patterns, data flow, and component relationships.
- **API Reference**: Endpoints, schemas, or interfaces if applicable.
