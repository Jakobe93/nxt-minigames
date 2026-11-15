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
    Nui.send('play', {
        token = s.token, id = s.id, difficulty = s.difficulty,
        tuning = s.tuning, introMs = Config.IntroMs, theme = Config.Theme,
    })
    Nui.focus(true)
    -- Watchdog: if the NUI never reports (crash, broken page), release focus and fail.
    SetTimeout(Config.SessionTimeoutSec * 1000 + 5000, function() finish(s, false) end)
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

-- Admin viewer. The server only sends this to ACE-permitted players; viewer
-- runs never talk to the session store, so opening it grants nothing.
RegisterNetEvent('nxt-minigames:client:viewer', function()
    if current then return end
    viewerOpen = true
    Nui.send('viewer', Nui.viewerPayload())
    Nui.focus(true)
end)

RegisterNUICallback('viewerClose', function(_, cb)
    cb({})
    viewerOpen = false
    Nui.focus(false)
end)

--- Client export for non-reward use (flavour, practice, gating purely client-side
--- visuals). Anything that grants items/money/access must use the server export Run.
--- local ok = exports['nxt-minigames']:Start('cipher', 4)   -- yields
exports('Start', function(id, difficulty)
    if current then return false end
    local s = lib.callback.await('nxt-minigames:cb:request', false, id, difficulty)
    if not s then return false end
    s.p = promise.new()
    play(s)
    return Citizen.Await(s.p)
end)

exports('IsOpen', function() return current ~= nil or viewerOpen end)
