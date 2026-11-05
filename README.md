# Aida Starter Template

This is a starter template for the Aida project. Please fork it and start your implementation by cloning this template.

## Installation

### Prerequisites

- Node.js 22.13+ (repo is pinned to 22.23.1 via `.nvmrc`)
- pnpm 11.10.0

### Setup
Upon opening GitHub Codespace, press the "Start" button at the bottom right of the screen. Once this is pressed, this button will changed to a finished button. Upon completion, you will need to press this finished button.

```bash
nvm use       # switch to the Node version pinned in .nvmrc (requires nvm)
pnpm install
```
###

### Development

```bash
pnpm dev       # run api + web together
pnpm dev:api   # run apps/api only  -> http://localhost:3000
pnpm dev:web   # run apps/web only  -> http://localhost:5173
```

### Other commands

```bash
pnpm build        # build all packages
pnpm lint         # lint all packages
pnpm check-types  # type-check all packages
```

## Project Structure

pnpm workspace + Turborepo monorepo:

```
apps/
├── web/      React + Vite frontend
├── api/      Express.js backend
└── shared/   Types/schemas shared between web and api (no build step)
```

- **apps/web** — React 19 (TypeScript + React Compiler), Vite, TailwindCSS.
- **apps/api** — Express.js (TypeScript), run via `tsx` in dev.
- **apps/shared** — zod schemas/types consumed directly as TS source by both apps.

Shared root config: `pnpm-workspace.yaml` (workspace layout), `turbo.json` (task pipeline), `tsconfig.base.json` (common TS options), `.nvmrc` (pinned Node version).

## Project Specification

### Frontend Architecture

- React (TypeScript + React Compiler) for core application
- TailwindCSS for styling

### Backend Architecture

- Express.js with TypeScript

### Development Tools

- Vite for build system
- ESLint and Prettier for code quality
- pnpm for package manager
- Turborepo for monorepo task orchestration
