# Ouija Online

A small multiplayer Ouija-style browser game built with Node, Express, and Socket.IO.

## Version

- Current version: `2.0.4`
- Created by `Piraticy`
- Source: [github.com/Piraticy/OuijaGame](https://github.com/Piraticy/OuijaGame)

## What's New In 2.0.4

- Both letter rows now curve the same direction (two nested arcs peaking in the middle) instead of
  mirroring into a lens/eye shape, matching a real talking board
- Redesigned the corner medallions as an actual sun (with a face) and crescent moon (with a star),
  and added the "Mystifying Oracle" subtitle under the board's title
- Darkened the board's wood tone toward the aged, weathered look of an antique board
- The app now checks for and applies updates automatically (on focus, on visibility change, and
  hourly) instead of only whenever the browser happens to notice on its own, so a long-lived open
  tab can't get stuck on a stale version indefinitely

## What's New In 2.0.3

- The planchette now always lands exactly on the letter/word it's spelling: targets are measured
  live from the rendered board instead of hand-guessed coordinates
- Bigger, clearer letters and numbers on the board's arc, so the spread reads at a glance while
  keeping the antique curved-board look
- Fixed a mobile layout bug where the letter rows could overlap the numbers and HELLO/GOODBYE row
- The Veil's answers are now anchored to the actual subject of your question instead of
  occasionally producing unrelated word combinations
- Added a password-protected `/admin` dashboard with live player/room counts and install stats
- Fixed the service worker so installed devices always pick up the latest version instead of
  getting stuck on whatever was cached at install time

## What's New In 2.0.2

- Reworked the main board into a wider vintage talking-board look with a parchment face, crest, and darker classic lettering
- Redesigned the planchette into a black-and-gold eye style inspired by old spirit board sets
- Retuned the letter and number target map so planchette movement follows the new spread layout more accurately
- Updated the in-game version badge to `v2.0.2`

## Features

- Join the same room from multiple browsers
- Share a room with a copyable invite link like `?room=ABC123`
- Share one live planchette across connected players
- Play solo by summoning a fictional in-game presence called `The Veil`
- Watch the planchette animate through question-aware eerie computer-generated answers
- Enable ambient sound, whisper bursts, candle flicker, and haunted board motion
- Set the current question for the room
- See room presence and a rolling whisper log

## Run locally

1. Install dependencies with `npm install`
2. Start the server with `npm run dev` for auto-reload or `npm start` for normal mode
3. Open `http://localhost:3000`
4. Join the same room code from another browser tab or device

## VS Code

Open the folder in VS Code and run the `Ouija Online Dev` launch configuration. It starts the dev server with file watching and opens the game in your browser.

## Install As An App

- On desktop browsers that support PWAs, use the in-app `Install` button.
- On iPhone or iPad, open the site in Safari, tap `Share`, then choose `Add to Home Screen`.

## Solo Play

Join a room by yourself and use `Summon` to enable the fictional solo presence. Ask a question and the board will answer with stylized spooky replies for a horror-game feel.

## Live Game

Play online at [https://ouijagame.onrender.com](https://ouijagame.onrender.com).

## Admin Dashboard

A small dashboard at `/admin` shows how many players are online right now, which rooms are
active, all-time session counts, and how many devices have installed the app as a PWA.

It is disabled by default. To enable it, set an `ADMIN_PASSWORD` environment variable before
starting the server:

```
ADMIN_PASSWORD=your-password npm start
```

Without `ADMIN_PASSWORD` set, `/admin` and its API return a plain 404, as if the route didn't
exist. With it set, the browser will prompt for credentials (any username, that password) before
showing the dashboard. Because those credentials are sent with Basic Auth, only use `/admin` over
HTTPS in production (Render's `*.onrender.com` domains are HTTPS by default).

Note: iOS Safari has no API to detect "Add to Home Screen," so install counts undercount iPhone
and iPad installs — only Android/desktop browsers that support the standard PWA install prompt
are reliably counted.

## Notes

This is a playful paranormal party-game theme, not a real spirit board product.
