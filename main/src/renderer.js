const ipcRenderer = require('electron').ipcRenderer;
const DecompressZip = require('decompress-zip');
const fs = require('fs');
const { Rcon } = require("rcon-client");
ipcRenderer.send('variable-request', ['path', 'app_path']);

let minecraft_dir = "";
let app_dir = "";

ipcRenderer.on('variable-reply', function (event, args) {
  minecraft_dir = args[0];
  app_dir = args[1];
  updateConsole(app_dir)
});


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
  if (state == "modpack") {
    file_to_unzip = "modpack.zip"
  } else if (state == "game") {
    file_to_unzip = "game.zip"
  } else {
    file_to_unzip = "resourcepack.zip"
  }
  let ZIP_FILE_PATH = `${app_dir}\\downloads\\${file_to_unzip}`;
  let unzipper = new DecompressZip(ZIP_FILE_PATH);

  unzipper.extract({
    path: minecraft_dir,
  });

  unzipper.on('extract', () => {
    updateConsole('Файлы разархивированы.');
    swal({
      title: "Файлы разархивированы",
      text: "Все необходимые для работы файлы успешно загружены и распакованы",
      icon: "success",
      button: false,
      timer: 1500,
    });
    launch_button.disabled = false;
    buttonToggle(false, "launch");
  });
  
  unzipper.on('progress', function (fileIndex, fileCount) {
    updateConsole('Распакован файл ' + (fileIndex + 1) + ' из ' + fileCount, true);
  });
  
  unzipper.on('error', function (err) {
    updateConsole('При распаковке произошла ошибка: ' + err);
  });
};

async function downloadFile(url, filename) {
  try {
    fs.rmdirSync(`${app_dir}\\downloads\\${filename}`, { recursive: true });
  } catch(e) {};

  ipcRenderer.send("downloadUpdate", {
    url: url,
      properties: {
        directory: `${app_dir}\\downloads\\`,
          filename: filename,
          showBadge: false,
        }});
}


ipcRenderer.on('updateDownloadProgress', (event, obj) => {
  let progress_bar_text = document.getElementById("progress_bar_text");
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
  progress_bar.value = Math.floor(obj.percent * 100);
});

ipcRenderer.on("DownloadCompleted", (event, obj) => {
  updateConsole(`Загрузка файла ${obj.path} (${obj.url}) завершена.`);
  let extract = "";

  if (obj.url.includes("modpack.zip")) {

    try {fs.rmdirSync(`${minecraft_dir}\\config\\`, { recursive: true });
    fs.rmdirSync(`${minecraft_dir}\\mods\\`, { recursive: true });} catch(e){};

    extract = "modpack";
  } else if (obj.url.includes("resourcepack.zip")) {

    try {
    fs.rmdirSync(`${minecraft_dir}\\resourcepacks\\`, { recursive: true });} catch(e){};

    extract = "resourcepack";
  } else {

    try {
    fs.rmdirSync(minecraft_dir, { recursive: true }); } catch(e){};

    extract = "game";
  }
  unzipManager(extract);

})
