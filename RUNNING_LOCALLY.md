# Running the App Locally

## Start both frontend and backend

From the project root (`D:\girvi-app`):

```bash
npm run dev
```

That's it — starts backend and frontend together in one terminal. Output is
color-coded and labeled `[backend]` / `[frontend]` so you can tell them apart.

`Ctrl+C` stops both.

## First-time setup

If you just cloned the repo, install dependencies in all three places first:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Then run `npm run dev` from the root as above.

## Why this works

The root `package.json` uses a tool called `concurrently` to run the
backend's and frontend's own `dev` scripts side by side. You don't need to
touch `concurrently` directly — just run `npm run dev` from the root.
