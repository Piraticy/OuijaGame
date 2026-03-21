# Ouija Online

A small multiplayer Ouija-style browser game built with Node, Express, and Socket.IO.

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
- The app includes a manifest, install UI, icons, and a service worker for a more app-like experience.

## Solo Play

Join a room by yourself and use `Summon` to enable the fictional solo presence. Ask a question and the board will answer with stylized spooky replies for a horror-game feel.

## Deploy Online

This project is ready for simple online hosting with either Node or Docker.

### Docker

1. Build the image with `docker build -t ouija-online .`
2. Run it with `docker run -p 3000:3000 -e HOST=0.0.0.0 -e PORT=3000 ouija-online`
3. Open `http://localhost:3000`

### App Hosts

The repo now includes a `Procfile`, a `Dockerfile`, and a `/status` endpoint, so it can be deployed on hosts that support Node apps or Docker containers. Point your host at the repository, expose port `3000`, and keep `HOST=0.0.0.0`.

### Render

This repo now includes a `render.yaml` blueprint for a Node web service. After pushing the code to GitHub:

1. Create a new `Web Service` or `Blueprint` in Render
2. Connect the GitHub repository
3. Let Render use the included `render.yaml`
4. Deploy and use the generated `onrender.com` URL as the installable app link

## Notes

This is a playful paranormal party-game theme, not a real spirit board product.
