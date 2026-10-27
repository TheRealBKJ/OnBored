# OnBored
A Project for the CS2701 Class at Georgia Tech. A platform to help new engineers to a company handle team specific onboarding

## What it does

Senior engineers write onboarding **plans**, add **docs and decision records**, and map the **codebase** (what each area does, why it is built that way, who owns it). New engineers work through their plan, scan the codebase, pick up small **starter tasks** found by a scanner or recommended by seniors, and **message** the people who built things. When a senior gives a good answer, they save it as a "why" record, so the next hire gets it from **Ask why** without asking again.

This is a front-end proof of concept. All data is demo data stored in your browser's localStorage. There is no backend yet.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # run the test suite once
npm run test:watch   # rerun tests on save
npm run build        # typecheck + production build
npm run lint
```

Use **Viewing as (demo)** at the bottom of the sidebar to switch between a senior (Priya, Marcus, Dana) and a new engineer (Sam, Alex). **Reset demo data** restores the seed.

## Stack

React 19, TypeScript, Vite, React Router (hash routing), Tailwind CSS v4, Vitest with Testing Library.

## Layout

```
src/
  features/          one folder per view; each has a README.md and its tests
    home/            SeniorHome / NewHireHome
    plans/           SeniorPlans / NewHirePlans + shared PlanDetail
    library/         docs, decision records, captured whys
    codebase/        architecture map + repo scanner
    tasks/           starter-task board
    messages/        threads + "save as why"
  components/        shared UI (Layout, AskWhy, ui primitives)
  lib/               store, types, permissions, selectors, actions, search, scanner, seed
  test/              test setup and renderApp() helper
  routes.tsx         route table (used by main.tsx and tests)
```

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then the README in the feature you're touching.
