-- Authoritative session store. One live session per player; every session is one-shot.
local Sessions = {}          -- [token] = session
local ByPlayer = {}          -- [src] = token
local LastClientStart = {}   -- [src] = GetGameTimer() of last client-initiated request

local function log(fmt, ...)
    if Config.Debug then print(('[nxt-minigames] ' .. fmt):format(...)) end
end
local function warn(fmt, ...) print(('^3[nxt-minigames] ' .. fmt .. '^7'):format(...)) end

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
local function open(src, id, difficulty, origin)
    local g = type(id) == 'string' and Config.Games[id]
    if not g or not g.enabled then return nil, 'unknown_game' end
    local d = tonumber(difficulty)
    if not d or d ~= d then return nil, 'bad_difficulty' end
    d = math.max(1, math.min(10, math.floor(d)))
    if GetPlayerPing(src) <= 0 then return nil, 'no_player' end
    if ByPlayer[src] then return nil, 'busy' end

    local s = {
        token = newToken(), src = src, id = id, difficulty = d, origin = origin,
        issued = GetGameTimer(), expires = GetGameTimer() + Config.SessionTimeoutSec * 1000,
        promise = promise.new(),
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
local function report(src, token, ok, reason)
    local s = type(token) == 'string' and Sessions[token]
    if not s or s.src ~= src then return false end
    local now = GetGameTimer()
    if now > s.expires then close(s, false, 'expired'); return false end
    if ok == true then
        local elapsed, floor = now - s.issued, floorMs(s.id, s.difficulty)
        if elapsed < floor then
            warn('src=%d reported a %s D%d pass in %dms (floor %dms) — rejected', src, s.id, s.difficulty, elapsed, floor)
            close(s, false, 'too_fast'); return false
        end
        close(s, true, nil); return true
    end
    close(s, false, type(reason) == 'string' and reason:sub(1, 64) or 'failed')
    return false
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
    open = open, close = close, report = report, floorMs = floorMs, log = log, warn = warn,
    clientStartAllowed = function(src)
        local now, last = GetGameTimer(), LastClientStart[src]
        if last and now - last < Config.ClientStartCooldownMs then return false end
        LastClientStart[src] = now
        return true
    end,
    active = function(src) local t = ByPlayer[src]; return t and Sessions[t] or nil end,
}
