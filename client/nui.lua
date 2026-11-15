-- NUI plumbing: focus, messages, payload shaping. No game logic lives here.
Nui = {}

function Nui.send(action, data)
    data = data or {}
    data.action = action
    SendNUIMessage(data)
end

function Nui.focus(on)
    SetNuiFocus(on, on)
end

function Nui.close()
    Nui.send('close')
    Nui.focus(false)
end

--- Player settings every screen needs: nxt-hud's Reduce motion switch, and rhythm audio.
function Nui.withPrefs(data)
    data.reduceMotion = GetResourceState('nxt-hud') == 'started' and exports['nxt-hud']:isReduceMotion() == true
    data.volume = Config.Volume
    data.audioOffsetMs = Config.AudioOffsetMs
    return data
end

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then SetNuiFocus(false, false) end
end)
