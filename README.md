# Sound Arcade

A turnkey music site with a game cabinet. Fill in a setup page, drop in your songs, press Build,
upload. Made by Jerm747 ([jerm747.dev](https://jerm747.dev)).

- **Artist home page:** the album up top, a scroll tour of your cities over a night map, and an
  arcade room of things to play (tape deck, turntable, beat pad, eras, power-up, studio, liner
  notes, formats). All of it set on the setup page.
- **Music player:** your songs with covers, search, tempo/year filters, albums, song pages with
  versions, a player bar that keeps playing between pages, lock-screen controls, intro splash,
  About and Contact.
- **Game cabinet** at `/games/`: a controller-first arcade shelf (from jerm747.games) with
  Flight Control Deck as the starter game. The site's music keeps playing there, with a music
  player that opens over the shelf or a paused game. Your title on the marquee, your artwork or gradient on
  the side panels.
- **Setup page:** every word, color and image in one form, plus music scanning and one-button
  builds with a live log.
- **Cover Studio:** palettes for the marble song covers, your center mark, and album covers.

Everything the site shows lives in **`site.config.json`**. The built site reads it when the page
opens, so after the first upload you can change words, colors and artwork by replacing that one
file. No rebuild needed.

## Quick start

You need [Node.js](https://nodejs.org) (the LTS version; it includes npm). Nothing else.

1. **Open the setup page.** Double-click `start-windows.bat` (Windows) or `start-mac.command`
   (Mac), or run `npm start` in this folder. It opens `http://localhost:7470` in your browser.
   Keep that window open while you work.
2. **Fill in each section** (your site, look, home page, about & contact, music, games). Press **Save** (or Ctrl/Cmd+S).
3. **Add music.** Put audio files in `music/`, then press **Scan music**.
4. **Build.** Press **Save and build site**. The first build installs packages (needs internet,
   about a minute). Then press **Preview built site** to check it.
5. **Upload everything inside `dist/`** to your web host: cPanel File Manager, FTP, or a drag-and-drop host
   like Netlify. Any host that serves plain files works; no database or server code needed.

Changed only code, not songs? **Build without music** skips copying audio, so you don't re-upload it.

## What's in the box

| Path | What it is |
|---|---|
| `site.config.json` | All your settings. Edited by the setup page, or by hand. |
| `music/` | Your audio files. Copied to `dist/audio/` when you build. |
| `assets/uploads/` | Images you add on the setup page (logo, photos, covers, artwork). |
| `setup/` | The setup page and its helper (`server.mjs`, no extra packages). |
| `tools/cover-studio.html` | Cover Studio (open it from the setup page). |
| `apps/player/` | The music player (React + Vite). Your home page. |
| `apps/games/` | The game cabinet (React + Vite). Goes to `/games/`. |
| `apps/games/public/projects/` | One folder per game. See `README.txt` in there. |
| `apps/player/src/home/` | The home page and its pieces. Edit `home.src.css`, not `home.css`. |
| `shared/` | Cover drawing and palettes, used by the player and the tools. |
| `scripts/` | `make-tracks` (song list), `sync` (copies settings into the apps), `build`. |
| `dist/` | The finished site, made by Build. Upload its contents. |

## Home page

Section 3 of the setup page. Everything is optional; leave a field blank to hide it.

- **Cities:** add them in travel order. Type a city name and pick from the list to fill in its
  position, or type the latitude and longitude (right-click a spot in Google Maps to copy them).
  Uncheck "A stop on the tour" for a place that should only glow on the map.
- **Opens:** the arcade piece a stop's button opens, with a "how to play" line under the quote.
- **Road:** optional points (`latitude, longitude`, one per line) for the highway drawn under the route.
- **Character cutout:** a transparent PNG or WebP of the artist, used by the eras, power-up and
  studio pieces. Without one, a plain silhouette stands in.
- **Coastline:** US East Coast is built in. With None, the map shows only the lights.

## Song file names

The scan reads these from file names (all optional):

| Example | Becomes |
|---|---|
| `0003 Who We Are.mp3` | order 3, title "Who We Are" |
| `Night Drive B96PM.mp3`, `96BPM`, `96 BPM`, `96.41BPM` | tempo |
| `Song 20251113 172819.wav` | date 2025-11-13 (otherwise the file's own date) |
| `Song-404.mp3` + `Song-405.mp3` | one song with two versions; the newest plays first |
| `Song ft Someone.mp3` (`ft`, `feat`, `featuring`) | featured artists |
| `DEMO 02 Song.mp3` | track 2 of the album with prefix `DEMO` |
| `ALL-CAPS-NAMES`, `lower_case_names` | Title Case |

## Games

Put a folder with an `index.html` in `apps/games/public/projects/` and it's on the shelf after the
next build. Optional `project.json` (title, description, controls, controller-to-key mapping) and
`cover.jpg` (1280 × 720). Full field list: `apps/games/public/projects/README.txt`.

On PHP hosting (GoDaddy, cPanel and similar), the cabinet lists the server's `games/projects/`
folder live through `games/api/games.php`, so uploading a game folder there shows it with no rebuild.
Elsewhere it uses the list made at build time.

Turn the cabinet off with **Include the game cabinet** on the setup page.

**Controls panel.** Players press **Controls** on the shelf (X on a controller, C on a keyboard) to
remap keys, map controller buttons, turn on on-screen touch buttons, and choose how games open
(fill the window, full screen, screen direction). It works for any game with no code in the game:
the arcade turns their choices into the keys the game already listens for. List a game's actions in
its `project.json` to give the panel good names (see `projects/README.txt`).

## For developers

```bash
npm install          # once (npm workspaces: installs both apps)
npm start            # setup page
npm run dev          # player with live reload, localhost:5173
npm run dev:games    # cabinet with live reload (address shown in the terminal)
npm run tracks       # rebuild tracks.json from music/
npm run build        # everything into dist/   (npm run build -- --no-audio to skip music)
npm test             # file-name parser, covers, game list
```

The setup page's **Developer tools** section runs the same dev servers with the log on the page.

How the pieces fit:

- `site.config.json` and `tracks.json` are copied into each app's `public/` folder by
  `scripts/sync.mjs` (runs before dev and build). The apps `fetch()` them at load time, so the
  build itself has no personal data baked in. One build can serve any site.
- Covers are drawn in the browser from `shared/covers.js` (marble panel, palette color, your mark).
  Real artwork on an album replaces the drawn cover.
- Both apps build with `base: './'`, so `dist/` works from any folder or domain.

## Version

v0.3.1: music in the arcade, on top of the artist home page (v0.3.0), on top of the arcade controls (v0.2.0) and the first master build (v0.1.0). See `CHANGELOG.md`.
