-- Authoritative session store. One live session per player; every session is one-shot.
local Sessions = {}          -- [token] = session
local ByPlayer = {}          -- [src] = token
local LastClientStart = {}   -- [src] = GetGameTimer() of last client-initiated request

local function log(fmt, ...)
    if Config.Debug then print(('[nxt-minigames] ' .. fmt):format(...)) end
end
local function warn(fmt, ...) print(('^3[nxt-minigames] ' .. fmt .. '^7'):format(...)) end

-- Input an unmodified client could not have sent (nxt-md WORKING.md, "Impossible input: nxt:flag").
-- Server-only local event; the input is still refused as before.
local function flag(src, what, detail)
    TriggerEvent('nxt:flag', src, 'minigames.' .. what, detail)
end

--- A tuning curve at a difficulty, the same interpolation the page uses (core.js U.L / U.Li).
local function curve(id, name, d, a, b, int)
    local t = Config.Games[id].tuning or {}
    local c = type(t[name]) == 'table' and t[name] or { a, b }
    local v = c[1] + (c[2] - c[1]) * (d - 1) / 9

    return int and math.floor(v + 0.5) or v
end

--- Cipher Lock's code is made and kept here; the page only ever sees the colours of a guess.
local function newCipher(d, length)
    local len = length or curve('cipher', 'length', d, 4, 6, true)
    local dupes = d >= 6
    local pool = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' }
    local code = {}

    for i = 1, len do
        if dupes then
            code[i] = pool[math.random(10)]
        else
            local j = math.random(i, 10)
            pool[i], pool[j] = pool[j], pool[i]
            code[i] = pool[i]
        end
    end

    return { code = code, tries = curve('cipher', 'tries', d, 8, 5, true), used = 0 }
end

--- Colours a guess against a code, Wordle's rule for repeated digits.
---@return string[] res 'hit' | 'near' | 'miss' per digit
---@return integer hits
local function score(code, digits)
    local res, left, hits = {}, {}, 0

    for i = 1, #code do
        local g = digits:sub(i, i)

        if g == code[i] then
            res[i] = 'hit'
            hits = hits + 1
        else
            res[i] = 'miss'
            left[code[i]] = (left[code[i]] or 0) + 1
        end
    end

    for i = 1, #code do
        local g = digits:sub(i, i)

        if res[i] ~= 'hit' and (left[g] or 0) > 0 then
            res[i] = 'near'
            left[g] = left[g] - 1
        end
    end

    return res, hits
end

local function newToken()
    local t = {}
    for i = 1, 24 do t[i] = ('%x'):format(math.random(0, 15)) end
    return table.concat(t)
end

local function floorMs(id, d)
    local g = Config.Games[id]
    local f = g and g.minSolveMs or { 0, 0 }
    return math.floor((f[1] + (f[2] - f[1]) * (d - 1) / 9) * (Config.FloorScale or 1))
end

--- Validates inputs and opens a session. Returns session or nil, reason.
local function open(src, id, difficulty, origin, opts)
    local g = type(id) == 'string' and Config.Games[id]
    if not g or not g.enabled then return nil, 'unknown_game' end
    local d = tonumber(difficulty)
    if not d or d ~= d then return nil, 'bad_difficulty' end
    d = math.max(1, math.min(10, math.floor(d)))
    if GetPlayerPing(src) <= 0 then return nil, 'no_player' end
    if ByPlayer[src] then return nil, 'busy' end

    local s = {
        token = newToken(), src = src, id = id, difficulty = d, origin = origin,
        theme = type(opts) == 'table' and type(opts.theme) == 'string' and Config.Themes[opts.theme] and opts.theme or nil,
        issued = GetGameTimer(), expires = GetGameTimer() + Config.SessionTimeoutSec * 1000,
        promise = promise.new(),
        cipher = id == 'cipher' and newCipher(d) or nil,
    }
    Sessions[s.token] = s
    ByPlayer[src] = s.token
    log('open %s src=%d %s D%d', origin, src, id, d)
    return s
end

--- Closes a session exactly once and resolves anyone waiting on it.
local function close(s, ok, reason)
    if s.closed then return end
    s.closed = true
    Sessions[s.token] = nil
    if ByPlayer[s.src] == s.token then ByPlayer[s.src] = nil end
    local ms = GetGameTimer() - s.issued
    s.result = { ok = ok, reason = reason, ms = ms }
    s.promise:resolve(s.result)
    log('close src=%d %s D%d ok=%s reason=%s %dms', s.src, s.id, s.difficulty, tostring(ok), tostring(reason), ms)
    -- Server-local hook for logging/analytics resources. Not a net event.
    TriggerEvent('nxt-minigames:server:result', s.src, {
        id = s.id, difficulty = s.difficulty, ok = ok, reason = reason, ms = ms, origin = s.origin,
    })
end

--- Handles the client's report. The client can only ever turn its own open session into a result.
--- The session a client message is about, or nil. A token that belongs to another player is
--- impossible for an unmodified client and is flagged.
local function owned(src, token)
    local s = type(token) == 'string' and Sessions[token]

    if not s then return end

    if s.src ~= src then
        flag(src, 'foreign_token', { game = s.id })
        return
    end

    return s
end

--- Handles the client's report. The client can only ever turn its own open session into a result.
local function report(src, token, ok, reason)
    local s = owned(src, token)

    if not s then return false end

    local now = GetGameTimer()

    if now > s.expires then
        close(s, false, 'expired')
        return false
    end

    if ok ~= true then
        close(s, false, type(reason) == 'string' and reason:sub(1, 64) or 'failed')
        return false
    end

    -- Cipher Lock is scored here: the page reports a pass only after the server said solved.
    if s.cipher and not s.cipher.solved then
        flag(src, 'cipher_unsolved', { used = s.cipher.used })
        close(s, false, 'unsolved')
        return false
    end

    local elapsed, floor = now - s.issued, floorMs(s.id, s.difficulty)

    if elapsed < floor then
        warn('src=%d reported a %s D%d pass in %dms (floor %dms) — rejected', src, s.id, s.difficulty, elapsed, floor)

        -- The limits are still estimates: only far below one is impossible for a person.
        if elapsed < floor / 2 then
            flag(src, 'too_fast', { game = s.id, difficulty = s.difficulty, ms = elapsed, floor = floor })
        end

        close(s, false, 'too_fast')
        return false
    end

    close(s, true, nil)
    return true
end

--- One Cipher Lock guess. Returns { res, left, solved, code? } or nil; `code` only once the tries run out.
local function guess(src, token, digits)
    local s = owned(src, token)

    if not s then return end

    local c = s.cipher

    if not c then
        flag(src, 'guess_wrong_game', { game = s.id })
        return
    end

    -- A late guess after a win or lockout can be a double press: refuse, no flag.
    if c.solved or c.used >= c.tries then return end

    if type(digits) ~= 'string' or #digits ~= #c.code or not digits:match('^%d+$') then
        flag(src, 'bad_guess', { length = type(digits) == 'string' and #digits or nil })
        return
    end

    local res, hits = score(c.code, digits)

    c.used = c.used + 1
    c.solved = hits == #c.code

    local out = { res = res, left = c.tries - c.used, solved = c.solved }

    if not c.solved and out.left <= 0 then out.code = table.concat(c.code) end

    return out
end

-- Expiry sweep: covers clients that never report (crash, alt-F4, NUI failure).
CreateThread(function()
    while true do
        Wait(5000)
        local now = GetGameTimer()
        for _, s in pairs(Sessions) do
            if now > s.expires then close(s, false, 'expired') end
        end
    end
end)

AddEventHandler('playerDropped', function()
    local src = source
    local token = ByPlayer[src]
    if token and Sessions[token] then close(Sessions[token], false, 'dropped') end
    LastClientStart[src] = nil
end)

AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end
    for _, s in pairs(Sessions) do close(s, false, 'resource_stop') end
end)

SessionStore = {
    open = open, close = close, report = report, guess = guess, floorMs = floorMs, log = log, warn = warn,
    newCipher = newCipher, score = score,
    clientStartAllowed = function(src)
        local now, last = GetGameTimer(), LastClientStart[src]
        if last and now - last < Config.ClientStartCooldownMs then return false end
        LastClientStart[src] = now
        return true
    end,
    active = function(src) local t = ByPlayer[src]; return t and Sessions[t] or nil end,
}
