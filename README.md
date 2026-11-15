# nxt-minigames

Hacking minigame suite for the server: NUI minigames that other scripts start, with results the server checks
before it trusts them, and a staff viewer for testing every game.

**Version 1.6.0**

## Requirements

- `ox_lib`
- Nothing else. Scripts that want a minigame call this resource's exports.
- Optional: `nxt-admin` (the staff viewer is reached from its menu), `nxt-hud` (Reduce motion).

## Install

1. Put the folder in `resources` as `nxt-minigames`.
2. `ensure nxt-minigames` after `ensure ox_lib`.
3. On start the server prints `[nxt-minigames] v1.6.0 started — 21 minigames enabled`. A different version
   there means a stale copy.

No SQL and no items.

## Configuration

Two files. Every player downloads `config.lua`, so it holds only what is safe to see; everything a cheater could
use is in `server/config.lua`, which no client receives.

`config.lua` (client-safe): `Config.Volume`, `Config.AudioOffsetMs`, `Config.IntroMs`, `Config.ResultHoldMs`.

`server/config.lua` (server-only):

- `Config.Theme`: the look when neither the calling script nor the game picks one: `'terminal'` (green
  phosphor, mono) or `'nxt'` (house style). `Config.Themes` lists every look a call may ask for.
- `Config.AllowClientStart`, `Config.ClientStartCooldownMs`: whether client scripts may start a session, and how
  often.
- `Config.SessionTimeoutSec`: session expiry. `Config.FloorScale` multiplies every fastest-solve limit.
- `Config.Games[id]`: `enabled`, `minSolveMs` (a pass reported faster than this is refused) and `tuning`
  (difficulty curves as `{ value at D1, value at D10 }`).

## Exports, events and callbacks

| Side | Name | What it does |
|---|---|---|
| server export | `Run(src, id, difficulty, opts?)` | Runs a minigame for a player and waits. Returns `ok, { reason, ms }`. Use this whenever a result grants anything. `opts.theme` forces a look for this call. |
| server export | `RunAsync(src, id, difficulty, cb, opts?)` | The same without waiting; `cb(ok, info)`. |
| server export | `IsBusy(src)` | `true` while the player has a session open. |
| server export | `GetGames()` | `{ { id, label } }` for every enabled game. |
| server export | `CodeStart(src, difficulty, length?)` | Cipher Lock's code game for a keypad another resource draws (nxt-dui `codepad`). Returns `id, tries`. Difficulty sets the tries and whether digits repeat (D6+); `length` defaults to Cipher Lock's. |
| server export | `CodeGuess(src, id, guess)` | Scores a guess: `tiles, status`. `tiles` has a letter per digit (`g` right place, `y` elsewhere, `x` not in it); `status` is `nil`, `'cracked'` or `'out'`. A guess of the wrong length or for another player's code returns nothing. |
| server export | `adminOpenViewer(staffSrc)` | Called by nxt-admin only (its "Open editor" button). |
| client export | `Start(id, difficulty, opts?)` | Client-started session, for things with no reward. Returns a boolean. |
| client export | `IsOpen()` | A minigame or the viewer is on screen. |
| client export | `Stop()` | Ends the minigame on screen as a fail. Returns `true` if one was running. |
| server event (local) | `nxt-minigames:server:result` | `(src, { id, difficulty, ok, reason, ms, origin })` after every session. |
| net events | `nxt-minigames:client:play`, `nxt-minigames:client:viewer` | Internal: server to client. |
| callbacks | `nxt-minigames:cb:request`, `nxt-minigames:cb:report`, `nxt-minigames:cb:cipher` | Internal: client to server. |
| server event (local, fired) | `nxt:flag` | Fired for input an unmodified client cannot send (below). |

Game ids: `cipher`, `handshake`, `traceroute`, `packet`, `portsweep`, `patch`, `firewall`, `keymatrix`,
`keyderiv`, `carrier`, `memdiff`, `intercept`, `signal`, `crawler`, `pingball`, `buffer`, and the rhythm games
`clocksync`, `portknock`, `keyer`, `echo`, `beatcrawl`.

Which look a session gets: the call's `opts.theme`, else the game's own look (Memory Diff terminal, Ping Ball
arcade, each rhythm game its own), else `Config.Theme`.

## Staff viewer

Every game at any difficulty and look, with a results log. Viewer runs are practice: they never open a session,
so they cannot satisfy `Run` or `Start`.

- In game: admin menu > SCRIPTS > Minigames > Open editor. Who may open it is the rank permission
  "Open Minigames" (`module.nxt-minigames`) in nxt-admin's rank editor. No chat command and no `add_ace` lines.
- Server console, when nxt-admin is down: `minigames_viewer <player id>`.
- Opening `web/index.html` in a normal browser also opens it, for UI work without a server.

## Anti-cheat

- A session token is one-shot, bound to the player and expires on the server.
- Cipher Lock's code is made and kept on the server; the page sends each guess and gets back only the colours.
  A pass is accepted only after the server scored the right code.
- A pass reported faster than the game's fastest-solve limit is refused.
- Input an unmodified client cannot send fires `TriggerEvent('nxt:flag', src, code, detail)` (nxt-md WORKING.md,
  "Impossible input"), and is still refused:
  - `minigames.foreign_token`: a report or guess with another player's session token.
  - `minigames.too_fast`: a pass in under half the fastest-solve limit. Passes just under the limit are refused but
    not flagged, because the limits are still estimates.
  - `minigames.cipher_unsolved`: a Cipher Lock pass the server never scored.
  - `minigames.bad_guess`: a guess that is not digits of the code's length.
  - `minigames.guess_wrong_game`: a Cipher Lock guess for another game's session.

The full developer reference is `docs/reference.html`.

## Not tested in game

Checked outside the game only: Lua syntax, the server session logic against stubbed FiveM functions, and every
game rendered and played headless.

- `[VERIFY]` the fastest-solve limits (`minSolveMs`) against real players.
- `[VERIFY]` difficulty 9 and 10 in play.
- `[VERIFY]` none of the 1.3.0 layouts or the eight new games have been played in game; rhythm audio timing in
  the game's browser is untested (`Config.AudioOffsetMs` covers a late beat).
- `[VERIFY]` Reduce motion read from nxt-hud's `isReduceMotion` export.
- `[VERIFY]` the viewer opening from nxt-admin's "Open editor" (nxt-admin closes its own panel first).
- `[VERIFY]` right mouse (Port Sweep flags, Signal Path) and Esc inside the game's browser.
