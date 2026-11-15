local Store = SessionStore

local function payload(s)
    local g = Config.Games[s.id]

    return {
        token = s.token,
        id = s.id,
        difficulty = s.difficulty,
        tuning = { [s.id] = g.tuning or {} },
        theme = Config.Theme,
        forceTheme = s.theme,
        timeoutSec = Config.SessionTimeoutSec,
        cipher = s.cipher and { length = #s.cipher.code, tries = s.cipher.tries } or nil,
    }
end

--- What the staff viewer needs: every enabled game's tuning. Built here because the tuning
--- is server-only config.
local function viewerPayload()
    local tuning, enabled = {}, {}

    for id, g in pairs(Config.Games) do
        if g.enabled then
            tuning[id] = g.tuning or {}
            enabled[#enabled + 1] = id
        end
    end

    return { tuning = tuning, enabled = enabled, theme = Config.Theme }
end

--- Yields until the player finishes. Returns ok:boolean, info:{ reason, ms }
--- opts.theme picks the look for this call only ('terminal', 'nxt', 'synthwave', ...);
--- without it the game's own look, then Config.Theme, is used.
local function run(src, id, difficulty, opts)
    local s, why = Store.open(src, id, difficulty, 'server', opts)
    if not s then return false, { reason = why } end
    TriggerClientEvent('nxt-minigames:client:play', src, payload(s))
    local r = Citizen.Await(s.promise)
    return r.ok, { reason = r.reason, ms = r.ms }
end

--- Server export — use this whenever a result grants anything (items, money, access).
--- local ok, info = exports['nxt-minigames']:Run(source, 'keymatrix', 6)
exports('Run', run)

--- Non-yielding variant: cb(ok, info) fires once the session closes.
exports('RunAsync', function(src, id, difficulty, cb, opts)
    CreateThread(function()
        local ok, info = run(src, id, difficulty, opts)
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
lib.callback.register('nxt-minigames:cb:request', function(src, id, difficulty, opts)
    if not Config.AllowClientStart then return nil end
    if not Store.clientStartAllowed(src) then return nil end
    local s = Store.open(src, id, difficulty, 'client', opts)
    return s and payload(s) or nil
end)

lib.callback.register('nxt-minigames:cb:report', function(src, token, ok, reason)
    return Store.report(src, token, ok, reason)
end)

lib.callback.register('nxt-minigames:cb:cipher', function(src, token, digits)
    return Store.guess(src, token, digits)
end)

--- Opens the staff viewer for a player. Shared by nxt-admin's "Open editor" and the console command.
local function openViewer(src)
    if GetPlayerPing(src) <= 0 then return false, 'Player not found.' end
    if Store.active(src) then return false, 'Finish the current minigame first.' end

    TriggerClientEvent('nxt-minigames:client:viewer', src, viewerPayload())
    return true
end

-- Staff viewer, reached from the admin menu (nxt-md CONVENTIONS.md, "Admin panels"). nxt-admin checks the
-- session and the rank permission ("Open Minigames", module.nxt-minigames) and logs it before calling this.
-- A client cannot call a server export, and viewer runs never touch the session store.
exports('adminOpenViewer', function(staffSrc)
    return openViewer(staffSrc)
end)

local function registerAdmin()
    if GetResourceState('nxt-admin') ~= 'started' then return end

    exports['nxt-admin']:registerModule({
        id = 'nxt-minigames',
        label = 'Minigames',
        icon = 'puzzle-piece',
        desc = 'Test every minigame at any difficulty and look',
        editor = 'adminOpenViewer',
    })
end

CreateThread(registerAdmin)

AddEventHandler('onResourceStart', function(res)
    if res == 'nxt-admin' then registerAdmin() end
end)

-- Way in when nxt-admin is down: server console only.
RegisterCommand('minigames_viewer', function(source, args)
    if source ~= 0 then return end

    local ok, err = openViewer(tonumber(args[1]) or 0)

    print(ok and '[nxt-minigames] viewer opened' or ('[nxt-minigames] ' .. tostring(err)))
end, true)

CreateThread(function()
    local n = 0
    for _, g in pairs(Config.Games) do if g.enabled then n = n + 1 end end
    print(('^2[nxt-minigames] v%s started — %d minigames enabled^7'):format(Config.Version, n))
end)
