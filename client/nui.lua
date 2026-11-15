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

--- Enabled games' tuning tables plus the enabled id list, shaped for the viewer.
function Nui.viewerPayload()
    local tuning, enabled = {}, {}
    for id, g in pairs(Config.Games) do
        if g.enabled then
            tuning[id] = g.tuning or {}
            enabled[#enabled + 1] = id
        end
    end
    return { tuning = tuning, enabled = enabled, theme = Config.Theme }
end

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then SetNuiFocus(false, false) end
end)
