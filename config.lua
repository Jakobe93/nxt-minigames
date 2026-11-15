Config = {}

Config.Version = '1.2.1'           -- printed on start; bump with every delivered build
Config.Debug = false               -- verbose server logging of every session

-- 'terminal' (green phosphor, mono, NXT-NET header) or 'nxt' (house style: Rajdhani, cyan).
-- Admins can flip between both in the viewer to compare.
Config.Theme = 'terminal'

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
Config.IntroMs = 3500              -- intro card auto-starts after this (0 = wait for Start)
Config.ResultHoldMs = 1400         -- how long the pass/fail card stays up before closing
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
        tuning = { length = { 3, 5 }, symbols = { 5, 8 }, tries = { 16, 12 }, time = { 150, 100 } } },

    handshake = { label = 'Handshake Sync', enabled = true, minSolveMs = { 1500, 3000 },
        tuning = { hits = { 3, 6 }, faults = { 3, 1 }, windowDeg = { 24, 11 }, outerSpeed = { 1.2, 2.2 },
                   innerSpeed = { 0.8, 1.6 }, jitter = { 0.08, 0.3 }, time = { 40, 30 } } },

    traceroute = { label = 'Traceroute', enabled = true, minSolveMs = { 5000, 5000 },
        tuning = { grid = { 4, 6 }, hops = { 4, 9 }, flashMs = { 760, 380 }, time = { 14, 9 } } },   -- time is + hops

    packet = { label = 'Packet Audit', enabled = true, minSolveMs = { 2500, 5000 },
        tuning = { rules = { 1, 3 }, packets = { 8, 16 }, packetMs = { 5600, 2400 }, errors = { 3, 1 } } },

    portsweep = { label = 'Port Sweep', enabled = true, minSolveMs = { 2000, 5000 },
        tuning = { grid = { 5, 8 }, density = { 0.12, 0.19 }, time = { 120, 90 } } },

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
}
