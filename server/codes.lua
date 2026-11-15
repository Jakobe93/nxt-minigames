-- Cipher Lock's code game for a keypad another resource draws (nxt-dui's codepad): the code is
-- made and kept here, the calling resource passes each guess through and shows the colours.
local Store = SessionStore
local Codes = {}   -- [id] = { src, code, tries, used, expires }
local LastId = 0
local Tile = { hit = 'g', near = 'y', miss = 'x' }

local function sweep()
    local now = GetGameTimer()

    for id, c in pairs(Codes) do
        if now > c.expires then Codes[id] = nil end
    end
end

--- local id, tries = exports['nxt-minigames']:CodeStart(source, 5, 4)
--- Difficulty 1-10 sets the tries and whether digits repeat (D6+); length defaults to Cipher Lock's.
exports('CodeStart', function(src, difficulty, length)
    if not GetPlayerName(src) then return end

    local d = math.max(1, math.min(10, math.floor(tonumber(difficulty) or 1)))
    local len = tonumber(length) and math.max(1, math.min(8, math.floor(length))) or nil
    local c = Store.newCipher(d, len)

    sweep()

    LastId = LastId + 1
    c.src = src
    c.expires = GetGameTimer() + Config.SessionTimeoutSec * 1000
    Codes[LastId] = c

    return LastId, c.tries
end)

--- local tiles, status = exports['nxt-minigames']:CodeGuess(source, id, guess)
--- tiles: one letter per digit, g right place, y elsewhere in the code, x not in it ('gyxx').
--- status: nil (guess again), 'cracked' or 'out'. A guess that isn't the code's length in digits,
--- or for someone else's code, returns nothing.
exports('CodeGuess', function(src, id, guess)
    local c = Codes[id]

    if not c or c.src ~= src then return end

    if GetGameTimer() > c.expires then
        Codes[id] = nil
        return nil, 'out'
    end

    if type(guess) ~= 'string' or #guess ~= #c.code or not guess:match('^%d+$') then return end

    local res, hits = Store.score(c.code, guess)
    local tiles = {}

    for i = 1, #res do tiles[i] = Tile[res[i]] end

    c.used = c.used + 1

    local status = hits == #c.code and 'cracked' or c.used >= c.tries and 'out' or nil

    if status then Codes[id] = nil end

    return table.concat(tiles), status
end)

AddEventHandler('playerDropped', function()
    local src = source

    for id, c in pairs(Codes) do
        if c.src == src then Codes[id] = nil end
    end
end)
