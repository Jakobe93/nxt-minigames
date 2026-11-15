fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nxt-minigames'
author 'Jakobe / nxt'
description 'Hacking minigame suite: 13 NUI minigames, server-verified sessions, admin viewer'
version '1.5.0'

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

client_scripts {
    'client/nui.lua',
    'client/main.lua',
}

server_scripts {
    'server/config.lua',
    'server/sessions.lua',
    'server/main.lua',
}

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/style.css',
    'web/js/*.js',
    'web/js/games/*.js',
    'web/fonts/*.woff2',
}

nui_callback_strict_mode 'true'

dependencies {
    'ox_lib',
}
