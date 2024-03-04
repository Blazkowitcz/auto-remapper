const { app, Tray, Menu } = require('electron');
const os = require("os");
const userHomeDir = os.homedir();
const path = require('path');
const process = require('child_process');
const fs = require("fs");
let presets = "";

let tray = null;
let currentGame = "";
let currentPreset = "";
let currentProcess = "";
let deviceName = "";
let constructor = "";

app.on('ready', () => {
    if (!fs.existsSync(`${userHomeDir}/.config/auto-remapper/data.json`)) {
        const content = '{ "games": [] }'
        fs.writeFileSync(`${userHomeDir}/.config/auto-remapper/data.json`, content, err => {
            if (err) {
                console.error(err);
            }
        });
    }
    presets = require(`${userHomeDir}/.config/auto-remapper/data.json`);
    tray = new Tray(path.join(__dirname, 'icon.png'));

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Quit', type: 'normal', click: () => { app.quit(); } }
    ]);

    tray.setContextMenu(contextMenu);

    tray.setToolTip(currentGame !== "" ? currentGame : 'No preset started');

    setInterval(checkGame, 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function checkGame() {
    if (currentGame === "") {
        presets.games.forEach((game) => {
            process.exec(`ps -aux | grep '${game.process_name}' | grep -v -- '--color=auto' | grep -v -- 'grep'`, async function (err, stdout, stderr) {
                if (stdout !== "") {
                    await process.execSync(`echo "${presets.root.password}" | sudo -S input-remapper-control --command start --device "${game.device.constructor} ${game.device.name}" --preset "${game.preset_name}"`);
                    currentGame = game.name;
                    currentPreset = game.preset_name;
                    currentProcess = game.process_name;
                    constructor = game.device.constructor;
                    deviceName = game.device.name
                    tray.setToolTip(`${game.name} preset started on ${deviceName}`);
                }
            });
        });
    } else {
        process.exec(`ps -aux | grep '${currentProcess}' | grep -v -- '--color=auto' | grep -v -- 'grep'`, async function (err, stdout, stderr) {
            if (stdout === "") {
                await process.execSync(`echo "${presets.root.password}" | sudo -S input-remapper-control --command stop --device "${constructor} ${deviceName}" --preset "${currentPreset}"`);
                currentGame = "";
                currentPreset = "";
                currentProcess = "";
                constructor = "";
                deviceName = "";
                tray.setToolTip('No preset started')
            }
        });
    }
}
