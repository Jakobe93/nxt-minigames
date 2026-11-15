-- Server-only settings. Never listed in the manifest's files, so no client downloads them
-- (nxt-md WORKING.md, "What reaches the client"). Adds to the shared Config from config.lua.

Config.Debug = false               -- verbose server logging of every session

-- The look used when neither the calling script nor the game picks one: 'terminal' (green
-- phosphor, mono) or 'nxt' (house style). Some games have a look of their own (Memory Diff
-- terminal, Ping Ball arcade, the rhythm games one each), which beats this setting. A script
-- can still force any look for one call: Run(src, id, difficulty, { theme = 'nxt' }).
Config.Theme = 'terminal'

-- Every look a call may ask for. An unknown name is ignored.
Config.Themes = {
    nxt = true, terminal = true, synthwave = true, tactical = true,
    telegraph = true, sampler = true, arcade = true, club = true,
}

-- Admin viewer: /minigames opens every game with a difficulty picker. Viewer runs are
-- local practice only; they never create a session and can't satisfy Run()/Start().
Config.Viewer = {
    command = 'minigames',
    restricted = 'group.admin',    -- ox_lib ACE group
}

-- Sessions
Config.AllowClientStart = true     -- lets client scripts call exports['nxt-minigames']:Start()
Config.ClientStartCooldownMs = 1500
Config.SessionTimeoutSec = 240     -- hard server-side expiry for any session
Config.FloorScale = 1.0            -- multiplies every minSolveMs floor below

--[[
  Per-game settings.
    enabled     false hides the game from sessions and the viewer.
    minSolveMs  { at D1, at D10 } — a pass reported faster than this is rejected as
                'too_fast'. These are anti-injection floors, not fairness targets.
    tuning      difficulty curves: name = { value at D1, value at D10 }, linearly
                interpolated. Omit a key to use the built-in default shown here.
  Hard limits the games assume: keymatrix.codes <= 6; grids above ~8 will overflow the panel.
]]
Config.Games = {
    cipher = { label = 'Cipher Lock', enabled = true, minSolveMs = { 3000, 5000 },
        tuning = { length = { 4, 6 }, tries = { 8, 5 }, time = { 120, 90 } } },          -- repeated digits from D6

    handshake = { label = 'Handshake Sync', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { hits = { 3, 6 }, faults = { 3, 1 }, windowDeg = { 24, 11 }, outerSpeed = { 1.2, 2.2 },
                   innerSpeed = { 0.8, 1.6 }, jitter = { 0.08, 0.3 }, time = { 40, 30 } } },

    traceroute = { label = 'Traceroute', enabled = true, minSolveMs = { 5000, 5000 },
        tuning = { grid = { 4, 6 }, hops = { 4, 9 }, flashMs = { 760, 380 }, time = { 14, 9 } } },   -- time is + hops

    packet = { label = 'Packet Audit', enabled = true, minSolveMs = { 2500, 5000 },
        tuning = { rules = { 1, 3 }, packets = { 8, 16 }, packetMs = { 5600, 2400 }, errors = { 3, 1 } } },

    portsweep = { label = 'Port Sweep', enabled = true, minSolveMs = { 2000, 5000 },
        tuning = { grid = { 7, 10 }, density = { 0.13, 0.19 }, time = { 120, 100 } } },

    patch = { label = 'Patch Panel', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { pairs = { 4, 8 }, faults = { 3, 1 }, time = { 60, 40 } } },

    firewall = { label = 'Firewall Run', enabled = true, minSolveMs = { 12000, 7000 },
        tuning = { lanes = { 4, 6 }, layers = { 12, 24 }, strikes = { 3, 1 }, speed = { 150, 300 }, spacing = { 220, 150 } } },   -- strikes: hits allowed before fail

    keymatrix = { label = 'Key Matrix', enabled = true, minSolveMs = { 1000, 1800 },
        tuning = { grid = { 5, 7 }, sequence = { 3, 6 }, slack = { 3, 0 }, codes = { 4, 6 }, time = { 60, 35 } } },

    keyderiv = { label = 'Key Derivation', enabled = true, minSolveMs = { 800, 1500 },
        tuning = { ops = { 0, 3 }, time = { 40, 75 } } },

    carrier = { label = 'Carrier Tune', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { rounds = { 1, 2 }, tolerance = { 0.12, 0.05 }, noise = { 0, 0.12 }, time = { 35, 60 } } },

    memdiff = { label = 'Memory Diff', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { cols = { 6, 10 }, rows = { 5, 8 }, diffs = { 3, 7 }, errors = { 3, 1 }, time = { 60, 45 } } },

    intercept = { label = 'Intercept', enabled = true, minSolveMs = { 6000, 8000 },
        tuning = { targets = { 6, 14 }, errors = { 3, 1 }, speed = { 90, 200 }, spawnSec = { 1.0, 0.48 } } },

    signal = { label = 'Signal Path', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { grid = { 4, 7 }, time = { 45, 75 } } },

    crawler = { label = 'Net Crawler', enabled = true, minSolveMs = { 6000, 9000 },
        tuning = { mazeW = { 10, 13 }, mazeH = { 7, 8 }, daemons = { 2, 4 }, daemonSpeed = { 0.62, 0.92 }, chaos = { 0.45, 0.08 },
                   fragments = { 16, 30 }, tokens = { 3, 2 }, spoofSec = { 6, 3 }, strikes = { 3, 1 }, time = { 100, 80 } } },

    pingball = { label = 'Ping Ball', enabled = true, minSolveMs = { 6000, 9000 },
        tuning = { targets = { 4, 8 }, strikes = { 3, 2 }, gravity = { 760, 980 } } },

    buffer = { label = 'Buffer Flush', enabled = true, minSolveMs = { 8000, 15000 },
        tuning = { lines = { 6, 12 }, dropSec = { 0.8, 0.28 }, garbageSec = { 16, 10 }, time = { 120, 90 } } },   -- corrupted rows from D7

    -- Rhythm games: a run lasts as long as its chart, so the floors sit close to the shortest chart.
    clocksync = { label = 'Clock Sync', enabled = true, minSolveMs = { 12000, 12000 },
        tuning = { notes = { 18, 32 }, bpm = { 88, 124 }, travel = { 2.0, 1.35 }, chords = { 0.06, 0.18 },
                   perfect = { 0.075, 0.05 }, good = { 0.16, 0.11 }, misses = { 7, 4 } } },

    portknock = { label = 'Port Knock', enabled = true, minSolveMs = { 10000, 10000 },
        tuning = { knocks = { 14, 24 }, bpm = { 92, 118 }, approach = { 1.35, 0.9 }, size = { 32, 26 }, trails = { 0.15, 0.35 },
                   spinTurns = { 2, 3 }, perfect = { 0.085, 0.055 }, good = { 0.17, 0.12 }, misses = { 6, 4 } } },

    keyer = { label = 'Keyer', enabled = true, minSolveMs = { 6000, 6000 },
        tuning = { letters = { 3, 5 }, unit = { 0.3, 0.2 }, tapeSpeed = { 170, 260 }, releaseWin = { 0.22, 0.14 },
                   perfect = { 0.075, 0.05 }, good = { 0.16, 0.11 }, misses = { 5, 3 } } },

    echo = { label = 'Echo', enabled = true, minSolveMs = { 20000, 25000 },
        tuning = { rounds = { 3, 4 }, length = { 3, 4 }, bpm = { 88, 112 }, perfect = { 0.085, 0.055 }, good = { 0.18, 0.13 }, strikes = { 3, 2 } } },

    beatcrawl = { label = 'Beat Crawler', enabled = true, minSolveMs = { 6000, 8000 },
        tuning = { mazeW = { 8, 11 }, mazeH = { 5, 7 }, daemons = { 2, 3 }, fragments = { 12, 20 }, spoofBeats = { 12, 8 },
                   chaos = { 0.45, 0.2 }, bpm = { 96, 118 }, perfect = { 0.075, 0.05 }, good = { 0.17, 0.12 }, strikes = { 3, 2 }, time = { 110, 90 } } },
}
