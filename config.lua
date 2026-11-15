-- Client-safe settings: every player downloads this file. Anything a cheater could use (the
-- fastest-solve limits, rate limits, session timeouts) lives in server/config.lua.
Config = {}

Config.Version = '1.6.0'           -- printed on start; bump with every delivered build

-- Rhythm games: sound volume (0 to 1) and an audio offset in ms. If the beat sounds late
-- against the picture in game, raise the offset (try 30 to 80).
Config.Volume = 0.32
Config.AudioOffsetMs = 0

-- Screens
Config.IntroMs = 3500              -- intro card auto-starts after this (0 = wait for Start)
Config.ResultHoldMs = 1400         -- how long the pass/fail card stays up before closing
