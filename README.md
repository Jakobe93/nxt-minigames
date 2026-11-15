# nxt-minigames

Hacking minigame suite for the server: NUI minigames that other scripts start, with results the server checks
before it trusts them, and a staff viewer for testing every game.

**Version 1.3.0**

## Requirements

- `ox_lib`
- Nothing else. Scripts that want a minigame call this resource's exports.

## Install

1. Put the folder in `resources` as `nxt-minigames`.
2. `ensure nxt-minigames` after `ensure ox_lib`.
3. On start the server prints `[nxt-minigames] v1.3.0 started — 21 minigames enabled`. A different version
   there means a stale copy.

No SQL and no items.

## Configuration

`config.lua`:

- `Config.Theme`: the look when neither the calling script nor the game picks one: `'terminal'` (green
  phosphor, mono) or `'nxt'` (house style). `Config.Themes` lists every look a call may ask for.
- `Config.Volume`, `Config.AudioOffsetMs`: rhythm game volume, and an offset if the beat sounds late in game.
- `Config.Viewer`: the staff viewer command and the ACE group allowed to use it.
- `Config.AllowClientStart`, `Config.ClientStartCooldownMs`: whether client scripts may start a session, and how
  often.
- `Config.SessionTimeoutSec`, `Config.IntroMs`, `Config.ResultHoldMs`: session expiry, intro card length, result
  card length.
- `Config.Games[id]`: `enabled`, `minSolveMs` (a pass reported faster than this is refused) and `tuning`
  (difficulty curves as `{ value at D1, value at D10 }`).

## Exports, events and callbacks

| Side | Name | What it does |
|---|---|---|
| server export | `Run(src, id, difficulty, opts?)` | Runs a minigame for a player and waits. Returns `ok, { reason, ms }`. Use this whenever a result grants anything. `opts.theme` forces a look for this call. |
| server export | `RunAsync(src, id, difficulty, cb, opts?)` | The same without waiting; `cb(ok, info)`. |
| server export | `IsBusy(src)` | `true` while the player has a session open. |
| server export | `GetGames()` | `{ { id, label } }` for every enabled game. |
| client export | `Start(id, difficulty, opts?)` | Client-started session, for things with no reward. Returns a boolean. |
| client export | `IsOpen()` | A minigame or the viewer is on screen. |
| server event (local) | `nxt-minigames:server:result` | `(src, { id, difficulty, ok, reason, ms, origin })` after every session. |
| net events | `nxt-minigames:client:play`, `nxt-minigames:client:viewer` | Internal: server to client. |
| callbacks | `nxt-minigames:cb:request`, `nxt-minigames:cb:report` | Internal: client to server. |

Game ids: `cipher`, `handshake`, `traceroute`, `packet`, `portsweep`, `patch`, `firewall`, `keymatrix`,
`keyderiv`, `carrier`, `memdiff`, `intercept`, `signal`, `crawler`, `pingball`, `buffer`, and the rhythm games
`clocksync`, `portknock`, `keyer`, `echo`, `beatcrawl`.

Which look a session gets: the call's `opts.theme`, else the game's own look (Memory Diff terminal, Ping Ball
arcade, each rhythm game its own), else `Config.Theme`.

The full developer reference is `docs/reference.html`.

## Not tested in game

Checked outside the game only: Lua syntax, the server session logic against stubbed FiveM functions, and every
game rendered and played headless.

- `[VERIFY]` the fastest-solve limits (`minSolveMs`) against real players.
- `[VERIFY]` difficulty 9 and 10 in play.
- `[VERIFY]` none of the 1.3.0 layouts or the eight new games have been played in game; rhythm audio timing in
  the game's browser is untested (`Config.AudioOffsetMs` covers a late beat).
- `[VERIFY]` Reduce motion read from nxt-hud's `isReduceMotion` export.
- `[VERIFY]` right mouse (Port Sweep flags, Signal Path) and Esc inside the game's browser.
