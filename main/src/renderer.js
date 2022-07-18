const ipcRenderer = require('electron').ipcRenderer;
const DecompressZip = require('decompress-zip');
const fs = require('fs');
const { Rcon } = require("rcon-client");
ipcRenderer.send('variable-request', ['path', 'app_path', "app_version"]);

const {shell} = require('electron') // deconstructing assignment

let minecraft_dir = "";
let app_dir = "";

ipcRenderer.on('variable-reply', function (event, args) {
  minecraft_dir = args[0];
  app_dir = args[1];
  //updateConsole(app_dir)
  try {fs.rm(`${minecraft_dir}\\assets\\skins\\`, { recursive: true });} catch(e){};
});

ipcRenderer.on('kill-client', function (event, args) {
  killClient();
});

function killClient() {
  try{
    process.kill(client.pid, 'SIGINT');
  } catch {};
}

function deleteGameDir() {
  try{
    fs.rm(`${minecraft_dir}`, { recursive: true });
  } catch(e) {
    throw e;
  }
}

function returnToLauncher() {
  wasBooted = false;
  launch_button.disabled = false;
  buttonToggle(false);
  ipcRenderer.send('unminimize');
  updateConsole('Клиент был выключен (Код 302)');
  stopMonitoring();
}

function quitApp() {
  ipcRenderer.send('quit-app');
}

function deleteGameFile(dir) {
  try{
    fs.rm(`${minecraft_dir}\\${dir}`, { recursive: true });
  } catch(e) {
    throw e;
  }
}

function showScreenshotsFolder() {
  shell.openPath(`${minecraft_dir}screenshots`);;
}

async function executeRconCommand(command) {
  try {
    let rcon = await Rcon.connect({
    host: "yuoco.myogaya.jp", port: 15234, password: "iTCFSHYAugk7R6Mn"
  });
  let response = await rcon.send(command);
  rcon.end();
  return response.toString();
  } catch(e){
    return "FAIL";
  }
}

let file_to_unzip = ""

function unzipManager(state) {
  file_to_unzip = state;
  let ZIP_FILE_PATH = `${app_dir}\\downloads\\${file_to_unzip}`;
  let unzipper = new DecompressZip(ZIP_FILE_PATH);

  unzipper.extract({
    path: minecraft_dir,
  });

  unzipper.on('extract', () => {
    updateConsole('Файлы разархивированы.');
    document.getElementById('download-process-bar').style.width = '0%';

    if(file_to_unzip == "game.zip" || file_to_unzip == "modpack.zip"){

      Swal.fire({
        title: "Файлы разархивированы",
        text: "Все необходимые для работы файлы успешно загружены и распакованы",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });

      launch_button.disabled = false;
      buttonToggle(false, "launch");
    } else {
      update_blocked = false;
    }

    try {
      fs.rm(`${app_dir}\\downloads\\${file_to_unzip}`, { recursive: true });
    } catch(e) {};
  });
  
  unzipper.on('progress', function (fileIndex, fileCount) {
    updateConsole('Распакован файл ' + (fileIndex + 1) + ' из ' + fileCount, true);
  });
  
  unzipper.on('error', function (err) {
    updateConsole('При распаковке произошла ошибка: ' + err);
    try {
      fs.rm(`${app_dir}\\downloads\\${file_to_unzip}`, { recursive: true });
    } catch(e) {};
  });
};

async function downloadFile(url, filename) {
  try {
    fs.rm(`${app_dir}\\downloads\\${filename}`, { recursive: true });
  } catch(e) {};

  ipcRenderer.send("downloadUpdate", {
    url: url,
      properties: {
        directory: `${app_dir}\\downloads\\`,
          filename: filename,
          showBadge: false,
        }});
}

function updateDownloadProgress(current_percent) {
  let el = document.getElementById('download-process-bar');
  el.style.width = `${Math.floor(current_percent * 100)}%`;
}

ipcRenderer.on('updateDownloadProgress', (event, obj) => {
  updateDownloadProgress(obj.percent);

  /*let progress_bar_text = document.getElementById("progress_bar_text");
  let remaining = document.getElementById("remaining");
  let progress_bar = document.getElementById("progress_bar");

  progress_bar_text.innerHTML = Math.floor((obj.percent * 100)) + "%";
  let total = Math.floor(obj.totalBytes / 1024);
  let loaded = Math.floor(obj.transferredBytes / 1024);
  if(total > 1024){
    total = Math.floor(total / 1024) + "MB";
    loaded = Math.floor(loaded / 1024) + "MB";
  };
  if(!(total.toString().includes("MB"))){
    total = total + "KB";
    loaded = loaded + "KB";
  };
  remaining.innerHTML = `${loaded}/${total}`;

  progress_bar.max = 100;
  progress_bar.value = Math.floor(obj.percent * 100);*/
});

ipcRenderer.on("DownloadCompleted", (event, obj) => {
  updateConsole(`Загрузка файла ${obj.path} (${obj.url}) завершена.`);

  let extract = obj.url.match(/[a-zA-Z0-9]+\.zip/)

  if (obj.url.includes("modpack.zip")) {

    try {fs.rmSync(`${minecraft_dir}\\config\\`, { recursive: true });
    fs.rmSync(`${minecraft_dir}\\mods\\`, { recursive: true });} catch(e){};

  } else if (obj.url.includes("game.zip")) {

    try {
    fs.rmSync(minecraft_dir, { recursive: true });} catch(e){};

  }

  unzipManager(extract);

})
