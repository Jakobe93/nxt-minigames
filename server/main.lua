local Store = SessionStore

local function payload(s)
    local g = Config.Games[s.id]
    return { token = s.token, id = s.id, difficulty = s.difficulty, tuning = { [s.id] = g.tuning or {} } }
end

--- Yields until the player finishes. Returns ok:boolean, info:{ reason, ms }
local function run(src, id, difficulty)
    local s, why = Store.open(src, id, difficulty, 'server')
    if not s then return false, { reason = why } end
    TriggerClientEvent('nxt-minigames:client:play', src, payload(s))
    local r = Citizen.Await(s.promise)
    return r.ok, { reason = r.reason, ms = r.ms }
end

--- Server export — use this whenever a result grants anything (items, money, access).
--- local ok, info = exports['nxt-minigames']:Run(source, 'keymatrix', 6)
exports('Run', run)

--- Non-yielding variant: cb(ok, info) fires once the session closes.
exports('RunAsync', function(src, id, difficulty, cb)
    CreateThread(function()
        local ok, info = run(src, id, difficulty)
        if cb then cb(ok, info) end
    end)
end)

exports('IsBusy', function(src) return Store.active(src) ~= nil end)

exports('GetGames', function()
    local out = {}
    for id, g in pairs(Config.Games) do
        if g.enabled then out[#out + 1] = { id = id, label = g.label } end
    end
    table.sort(out, function(a, b) return a.label < b.label end)
    return out
end)

-- Client-initiated sessions (exports['nxt-minigames']:Start on the client).
lib.callback.register('nxt-minigames:cb:request', function(src, id, difficulty)
    if not Config.AllowClientStart then return nil end
    if not Store.clientStartAllowed(src) then return nil end
    local s = Store.open(src, id, difficulty, 'client')
    return s and payload(s) or nil
end)

lib.callback.register('nxt-minigames:cb:report', function(src, token, ok, reason)
    return Store.report(src, token, ok, reason)
end)

-- Admin viewer. ox_lib enforces the ACE restriction before this runs.
lib.addCommand(Config.Viewer.command, {
    help = 'Open the minigame viewer (test runs only)',
    restricted = Config.Viewer.restricted,
}, function(src)
    if src <= 0 then return print('[nxt-minigames] the viewer is in-game only') end
    if Store.active(src) then
        return TriggerClientEvent('ox_lib:notify', src, { type = 'error', description = 'Finish your current minigame first' })
    end
    TriggerClientEvent('nxt-minigames:client:viewer', src)
end)

CreateThread(function()
    local n = 0
    for _, g in pairs(Config.Games) do if g.enabled then n = n + 1 end end
    print(('^2[nxt-minigames] v%s started — %d minigames enabled, viewer: /%s (%s)^7')
        :format(Config.Version, n, Config.Viewer.command, Config.Viewer.restricted))
end)
