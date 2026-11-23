JERM747.GAMES PROJECTS
======================

Every folder in here that has an index.html shows up on jerm747.games automatically.
Each one also gets a shareable link: jerm747.games/#/play/<folder-name>
Folder names: letters, numbers, dashes, dots or underscores (e.g. my-new-game).

Optional files in a project folder:
  cover.png / cover.jpg / cover.webp   tile art, 1280x720 (16:9) fills the frame; other shapes get a blurred fill
  project.json                         details shown in the arcade:

{
  "title": "My Game",
  "tagline": "One line under the title",
  "description": "A few sentences.",
  "kind": "game",            game | app | site | tool | music | experiment
  "status": "in_progress",   prototype | in_progress | playable | stable | client
  "version": "v3",
  "controls": ["gamepad", "keyboard", "mouse", "touch"],
  "credit": "Built for Example Co. All rights reserved.",
  "accent": "#8FA7BF",       tile color when there is no cover
  "order": 30,               lower numbers come first
  "hidden": true,            leave it on the server but off the shelf

  "gamepad": { "A": " ", "X": "j" },        controller bridge for keyboard-only projects:
  "gamepadLabels": { "A": "Jump", "X": "Punch" }   button -> key the arcade presses for you
}

Bridge buttons: A B X Y LB RB LT RT SELECT START UP DOWN LEFT RIGHT
Keys are what the game checks: " " for Space, "j", "ArrowUp", "Enter", etc.
Don't map SELECT+START together; holding both returns to the shelf.

Controls panel (Controls button on the shelf, X on a controller, C on a keyboard)
---------------------------------------------------------------------------------
Players can remap keys, set controller buttons and turn on on-screen touch buttons for any game
before it starts. The arcade turns their choices into the keys your game already listens for,
so a game needs no code for any of this. To give the panel good names, list your game's actions:

  "actions": [
    { "id": "up",    "label": "Move up",   "key": "ArrowUp" },
    { "id": "jump",  "label": "Jump",      "key": " ",     "pad": "A" },
    { "id": "pause", "label": "Pause",     "key": "Enter", "pad": "START" }
  ],
  "controllerMode": "native"   the game reads the controller itself (default when it lists
                               "gamepad" in controls and has no "gamepad" map); "mapping" = the
                               arcade presses keys for it

Actions with the ids up, down, left and right drive the on-screen pad; the others can go on the
A, B, X and Y touch buttons. Without "actions", the panel uses the "gamepad" map plus the arrow keys.

Full screen: a game can ask the arcade to switch full screen by posting
  parent.postMessage({ type: 'sound-arcade-fullscreen', want: true }, location.origin)
and hears back { type: 'sound-arcade-fs', on: true|false }. To close back to the shelf, post
  { type: 'sound-arcade-exit' }.

Music (the site's songs, playing in the arcade)
-----------------------------------------------
The cabinet keeps the site's music playing and has a music player that opens over the game.
Players open it from the toolbar. To give your game its own Music button (say, on the pause screen):

  parent.postMessage({ type: 'sound-arcade-music-hello' }, location.origin)  // on load
    -> the arcade answers { type: 'sound-arcade-music-ready' }: show your Music button
  parent.postMessage({ type: 'sound-arcade-music-open' }, location.origin)   // button pressed
    -> the arcade sends 'sound-arcade-music-opened', then 'sound-arcade-music-closed' and
       gives your game focus back. Pause your game before opening it.

747 Pocket Player (handheld view)
---------------------------------
Every game can be played inside the 747 Pocket Player: the "Pocket" button in the game toolbar
turns it on, SCREEN on the Pocket goes back to the full game view, and the ⏏ eject button returns
to the shelf. SELECT opens the Pocket menu (theme, D-pad or joystick, full view, shelf).
The shell is public/pocket/pocket.js, the same file jerm747.games uses.

Site-wide settings live in site.config.json → games.pocket:

  "pocket": {
    "enabled": true,
    "defaultFinish": "returnity-amber",          returnity-amber | returnity-violet | ice | "" (Classic Gray)
    "finishes": ["auto", "returnity-violet", "classic"],  themes offered in the Pocket menu, in order
    "labels": { "auto": "Returnity Edition" },  menu names ("auto" = the site default above)
    "bezelTitle": "JERM747 ARCADE"
  }

Per game, add "pocket" to project.json (all optional):

  "pocket": {
    "mode": "gamepad",      gamepad = the Pocket acts as a controller for games that read the
                            gamepad themselves (Returnity). keys (default) = the Pocket presses
                            the keys from the game's "actions" (A/B/X/Y/LB/RB pads, START, SELECT).
    "default": true,        open in the Pocket the first time (players' own choice wins after that)
    "labels": { "a": "Jump", "b": "Fire", "x": "Strike", "y": "Backup" },   names on the buttons
    "buttons": { "a": 0 },  gamepad mode: controller button number per Pocket button (standard map)
    "hint": "One line for the Pocket's ? guide.",
    "hide": ".deck",        selectors hidden inside the game while it's in the Pocket (its own touch deck)
    "css": "...",           extra CSS put into the game while it's in the Pocket
    "ratio": 1.3333,        game screen shape inside the Pocket (default 4:3)
    "width": 880,           smallest layout width the game is drawn at before scaling (default 800)
    "off": true             never offer the Pocket for this game
  }
