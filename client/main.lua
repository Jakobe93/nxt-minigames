local current = nil        -- live session { token, id, difficulty, p? }
local viewerOpen = false

local function finish(s, verified)
    if current ~= s then return end
    current = nil
    Nui.close()
    if s.p then s.p:resolve(verified == true) end
end

local function play(s)
    if viewerOpen then viewerOpen = false; Nui.close() end
    current = s
    Nui.send('play', Nui.withPrefs({
        token = s.token,
        id = s.id,
        difficulty = s.difficulty,
        tuning = s.tuning,
        introMs = Config.IntroMs,
        theme = s.theme,
        forceTheme = s.forceTheme,
        cipher = s.cipher,
    }))
    Nui.focus(true)
    -- Watchdog: if the NUI never reports (crash, broken page), release focus and fail.
    SetTimeout((tonumber(s.timeoutSec) or 240) * 1000 + 5000, function() finish(s, false) end)
end

-- Server-initiated session (server export Run / RunAsync). The token is only
-- meaningful to the server, so a spoofed trigger here can't produce a pass.
RegisterNetEvent('nxt-minigames:client:play', function(s)
    if type(s) ~= 'table' or type(s.token) ~= 'string' then return end
    if current then return end
    play(s)
end)

RegisterNUICallback('result', function(data, cb)
    cb({})
    local s = current
    if not s or type(data) ~= 'table' or data.token ~= s.token then return end
    CreateThread(function()
        local verified = lib.callback.await('nxt-minigames:cb:report', false, s.token, data.ok == true, data.reason)
        Wait(Config.ResultHoldMs)
        finish(s, verified)
    end)
end)

-- Staff viewer. The server sends this only from nxt-admin (rank permission) or the console; viewer
-- runs never talk to the session store, so opening it grants nothing.
RegisterNetEvent('nxt-minigames:client:viewer', function(data)
    if current or type(data) ~= 'table' then return end
    viewerOpen = true
    Nui.send('viewer', Nui.withPrefs(data))
    Nui.focus(true)
end)

-- Cipher Lock guesses are scored by the server, which holds the code.
RegisterNUICallback('cipherGuess', function(data, cb)
    local s = current

    if not s or type(data) ~= 'table' or data.token ~= s.token then return cb({}) end

    cb(lib.callback.await('nxt-minigames:cb:cipher', false, s.token, data.guess) or {})
end)

RegisterNUICallback('viewerClose', function(_, cb)
    cb({})
    viewerOpen = false
    Nui.focus(false)
end)

--- Client export for non-reward use (flavour, practice, gating purely client-side
--- visuals). Anything that grants items/money/access must use the server export Run.
--- local ok = exports['nxt-minigames']:Start('cipher', 4, { theme = 'nxt' })   -- yields; opts optional
exports('Start', function(id, difficulty, opts)
    if current then return false end
    local s = lib.callback.await('nxt-minigames:cb:request', false, id, difficulty, opts)
    if not s then return false end
    s.p = promise.new()
    play(s)
    return Citizen.Await(s.p)
end)

exports('IsOpen', function() return current ~= nil or viewerOpen end)
