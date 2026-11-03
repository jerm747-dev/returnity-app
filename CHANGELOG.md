# Changelog

## v0.3.1 (2026-11-03), music in the arcade

- **Music player in the game cabinet**, the in-game mini player from jerm747.com: the song that's
  playing, seek, play/pause/skip, shuffle, volume, search, albums and the song list, over the shelf
  or over a game. Opens from the Music button (top bar on the shelf, toolbar in a game), Start on a
  controller or M on a keyboard on the shelf, or from a game's own pause screen.
- **Music carries between pages:** a song started on Music keeps going in the arcade (from the
  first tap) and comes back to Music at the same spot.
- Games can ask for it: `sound-arcade-music-hello` (the arcade answers `-ready`) and
  `sound-arcade-music-open`; the arcade tells the game `-opened` and `-closed`. jerm747.com's
  `jerm747-music-open` works too. See `apps/games/public/projects/README.txt`.
- The cabinet gets its own copy of `tracks.json` when you build.
- Fix: Esc no longer starts "hold to return to shelf" while a panel is open over a game.

## v0.3.0 (2026-11-03), artist home page

- **Artist home page** (Home in the menu; the library moves to Music). Turn it off on the setup page
  and the library is the home page again, as before.
  - Hero: album title in two weights, one line about the project, the route, hero artwork.
  - **Night map tour:** the cities glow on a dark map, linked by a road and a gold route, with a
    return arc from the last stop back to the first. Scrolling travels stop to stop; each stop's
    card holds a heading, the artist's quote or story, a "how to play" line and a button that opens
    a piece. Cities can be light-only. Text can be marked Draft.
  - **Arcade room**, a 4×2 grid that opens each piece below: tape deck (plays the real songs, sides
    A and B), turntable seen from above (start/stop, 33/45, pitch fader that changes the speed),
    16-step beat pad, eras orbit with a lever, power-up ladder, studio walkaround, liner notes,
    and formats. Each can be turned off.
- **Setup page → Home page** section: titles, artwork and character cutout, cities editor
  (type a city and its position fills in; reorder, stop or light only, quote, story, which piece it
  opens), coastline, brightest city, road points, eras with their own pictures and looks (color,
  black and white, gold glow), pieces on/off, power-up, liner notes, credits, coming-soon items.
- Player: play/pause/speed controls that the deck and turntable share with the player bar.
- Home styles live in `apps/player/src/home/home.src.css` and are scoped to the home page by
  `scripts/scope-css.mjs` (runs with every build).
- Sections on the setup page are renumbered (Home page is 3).

## v0.2.0 (2026-11-02), arcade controls

- **Controls panel** on the shelf (Controls button, X on a controller, C on a keyboard), per game,
  saved on the device:
  - Keyboard: remap any action to a different key (duplicates swap).
  - Controller: press a button to map an action, live button test, or let a game read the
    controller itself. The left stick follows the d-pad.
  - Touch: on-screen 8-way pad and up to four face buttons (choose the action on each), size,
    see-through level, swap sides. On by default on phones for games without their own touch controls.
  - Display: arcade mode (game fills the window), full screen on start, tuck the toolbar away,
    screen direction on phones. Site defaults set on the setup page (Games → How games open).
- The same panel opens from inside a game; changes apply right away.
- Full screen from Groove Squad Get Down made global: older Safari support, games can ask for full
  screen by message and hear back when it changes, leaving a game undoes only the arcade's own full screen.
- Games can list their actions in project.json (`actions`, `controllerMode`); Flight Control Deck does.
- Fixes: phone toolbar no longer wraps its labels.

## v0.1.0 (2026-11-02), first master build

The first time the music player, the game cabinet and the setup tools are combined into one package.

- **Setup page** (`npm start`, localhost:7470): every setting in one form, live preview of the
  look, image uploads, music scan, Save and build with a live log, preview of the built site,
  import/export of `site.config.json`, developer dev-server buttons.
- **Music player**, a slim rebuild of the Jerm747 player: splash, library with search and
  tempo/year/sort filters, albums, song pages with versions, persistent player bar with shuffle,
  seek and volume, lock-screen controls, About and Contact, menu on the left, right or top with a
  lines or dots button.
- **Game cabinet** from jerm747.games: marquee title, side panels (artwork, gradient, or the
  built-in sunset), shelf with controller/keyboard/touch support, Flight Control Deck as the
  starter game, optional live game list on PHP hosting.
- **Cover Studio**: neon, seasonal and single-color palettes, color editing, center mark, album
  covers (download PNG or put on an album).
- **Runtime settings**: the built site reads `site.config.json` and `tracks.json` at load, so
  words, colors and songs change without a rebuild.

