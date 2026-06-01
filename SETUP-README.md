# Splinterwood — Setup & Run Guide

How to get **The Splinterwood Ledger** running on your computer from scratch. No prior
experience needed — follow the steps in order.

---

## What you need first

1. **Node.js — version 20 or newer** (LTS recommended). This also installs `npm`, which
   the game uses to download its parts and run.
   - Download: https://nodejs.org  → get the "LTS" installer and run it.
   - To check it worked, open a terminal and run: `node -v` (should print v20.x or higher).
2. **Git** (to download the project).
   - Download: https://git-scm.com
   - Check: `git --version`
3. **A modern web browser** — Chrome, Edge, or Firefox.
4. **An internet connection** the first time you run it (some fonts and icons load from
   the web).

> A "terminal" is the Command Prompt / PowerShell on Windows, or Terminal on macOS/Linux.

---

## Step 1 — Download the project

In a terminal, go to the folder where you keep projects, then run:

```
git clone https://github.com/freedomfabricsofficial-droid/splinterwood.git
cd splinterwood
```

(If you'd rather not use Git: on the GitHub page click the green **Code** button →
**Download ZIP**, unzip it, then open a terminal inside the unzipped folder.)

---

## Step 2 — Install the game's dependencies

From inside the `splinterwood` folder, run:

```
npm install
```

This downloads everything the game needs (it's a one-time step and can take a minute or
two). You only need to do this again if the project's dependencies change.

---

## Step 3 — Run the game

```
npm run dev
```

The terminal will print a local web address, usually:

```
  ➜  Local:   http://localhost:5173/
```

Open that address in your browser and the game is running. Leave the terminal window
open while you play.

- **To stop the game:** click the terminal and press `Ctrl + C`.
- **To play again later:** `cd` back into the folder and run `npm run dev` again
  (you don't need to reinstall).

---

## Good to know

- **Your progress saves automatically** in the browser itself. Clearing your browser
  data for that site will erase your save. Inside the game there's a **Save** tab with
  Export / Import options if you want to back up or move a save.
- **Developer tools are visible** (a small panel in the corner: time-skip, grant coin,
  set levels, etc.). They're on for testing. They can be turned off later for a public
  build, so don't worry about them.
- **Internet on first load:** fonts and icons currently load from the web, so the very
  first run needs a connection. After that the browser caches them.

---

## Optional — build a production version

For normal playing and testing, `npm run dev` is all you need. A packaged production
build (`npm run build` → `npm run preview`) is still being tidied up, so stick with
`npm run dev` for now.

---

## Troubleshooting

- **`'node' is not recognized` / `command not found`** — Node.js isn't installed or the
  terminal was open before you installed it. Install Node, then open a *new* terminal.
- **`Cannot find module 'break_eternity.js'`** (or any missing module) — you skipped or
  interrupted Step 2. Run `npm install` again.
- **Weird build errors** — confirm your Node version: `node -v` should be 20 or higher.
- **"Port 5173 is already in use"** — something else is using that port. Vite will
  automatically pick another one; just open the new address it prints.
- **Blank page in the browser** — check the terminal for red error text, and make sure
  `npm install` finished without errors. A hard refresh (`Ctrl + Shift + R`) also helps.
