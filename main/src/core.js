let console = document.getElementById("console_log");

const progress_bar = document.getElementById("progress_bar");
const progress_bar_text = document.getElementById("progress_bar_text");
const remaining = document.getElementById("remaining");
const $ = require('jquery');

let minecraft_dir_alter = "";
let app_dir_alter = "";

ipcRenderer.on('variable-reply', function (event, args) {
    minecraft_dir_alter = args[0];
    app_dir_alter = args[1];
});

const crypto = require('crypto');

function getChecksum(path) {
    return new Promise((resolve, reject) => {
      // if absolutely necessary, use md5
      const hash = crypto.createHash('md5');
      const input = fs.createReadStream(path);
      input.on('error', reject);
      input.on('data', (chunk) => {
          hash.update(chunk);
      });
      input.on('close', () => {
          resolve(hash.digest('hex'));
      });
    });
}

async function downloadManager(instruction) {
    if (instruction == "GAME") {
        downloadFile("http://yuoco.myogaya.jp:8080/files/game.zip", "game.zip");
    } else if (instruction == "MODPACK") {
        downloadFile("http://yuoco.myogaya.jp:8080/files/modpack.zip", "modpack.zip");
    } else if (instruction == "RESOURCEPACK") {
        downloadFile("http://yuoco.myogaya.jp:8080/files/resourcepack.zip", "resourcepack.zip");
    }
};

function updateConsole(text, shouldReplace){
    let before = console.innerHTML;
    if (shouldReplace) {
        before = before.replace(/[\w\W]+?<br>+?/,"");
    };
    console.innerHTML = `${text}<br>${before}`;
};

function buttonToggle(isDisabled){
    let launch_button = document.getElementById("front");
    let back = document.getElementById("launch-button");
    if(isDisabled){
        launch_button.style.background = "grey";
        back.style.background = "rgb(54, 54, 54)";
    } else {
        launch_button.style.background = "linear-gradient(90deg, rgba(63,94,251,1) 0%, rgba(252,70,248,1) 100%)";
        back.style.background = "linear-gradient(90deg, rgba(17,32,108,1) 0%, rgba(164,31,161,1) 100%)";
    };
};

const { Client, Authenticator } = require('minecraft-launcher-core');
const launcher = new Client();

let opts = {
    clientPackage: null,
    authorization: null,
    root: "resources\\app\\.minecraft",
    forge: "resources\\app\\.minecraft\\forge-1.16.5-36.2.8-installer.jar",
    javaPath: path.resolve("resources\\app\\.minecraft\\jre1.8.0_281\\bin\\java.exe"),
    version: {
        number: "1.16.5",
        type: "release",
        custom: "1.16.5-forge-36.2.8"
    },
    memory: {
        max: null,
        min: null
    },
}

async function getLoginData() {
    let authData = {
        nickname: document.getElementById("nickname_placeholder").value,
        passwordMD5: CryptoJS.MD5(document.getElementById("password_placeholder").value).toString(),
        ip: user_ip,
    };
    return authData;
};

async function modpackChecked() {

    let api_url = "http://yuoco.myogaya.jp:8080/init.json";
    let response = await fetch(api_url);
    let data = await response.json();
    updateConsole(data.use);

    let newest_client_version = data.prod_version;
    let client = `${minecraft_dir_alter}\\client_version-${newest_client_version}.ino`;
    if (!fs.existsSync(client)) {
        return "GAME_NOT_INSTALLED";
    };
    
    // check resourcepack
    let res_zip = `${minecraft_dir_alter}\\resourcepacks\\_cit-version.zip`;

    let hash_0 = await getChecksum(res_zip);

    if (hash_0 !== data.resourcepack_MD5) {
        return "RESOURCEPACK_UPDATE";
    }

    let iter_file = null;

    // check modpack \/
    for (let [key, value] of Object.entries(data.required_mods)) {
        iter_file = `${minecraft_dir_alter}\\mods\\${key}`;

        if (!fs.existsSync(iter_file) && value[0]!="NO_HASH") {
            return "MODPACK_CORRUPTED";
         } else if (!fs.existsSync(iter_file) && value[0]=="NO_HASH"){
            // pass
         } else {
            // check file MD5 hash

            let hash = await getChecksum(iter_file)

            if (hash !== value[0]) {
                try{
                    fs.rmSync(iter_file);
                } catch(e){};
                updateConsole(`${hash}`);
                if (value[0]!="NO_HASH") {
                    return "MODPACK_CORRUPTED";
                };
            };
        };
        updateConsole(`${key} проверен.`, true);
    };

    return "MODPACK_CORRECT";

};

async function startupCheck() {
    let response = await connectToAuthServers(await getLoginData());
    if(response.includes("LOGGED_IN")) {
        let state = await modpackChecked();
        if(state == "MODPACK_CORRECT") {
            return "CORRECT";
        } else if (state == "GAME_NOT_INSTALLED") {
            updateConsole("Minecraft пока что не установлен, загружаю...");
            await downloadManager("GAME");
            return "INSTALL_GAME";
        } else if (state == "MODPACK_CORRUPTED") {
            updateConsole("Модпак не установлен или повреждён (Код 101), загружаю файлы заново.");
            await downloadManager("MODPACK");
            return "INSTALL_MODPACK";
        } else if (state == "RESOURCEPACK_UPDATE") {
            updateConsole("Доступно обновление для серверного ресурспака.");
            await downloadManager("RESOURCEPACK");
            return "INSTALL_RESOURCEPACK";
        } else {
            updateConsole("Не удалось проверить целостность файлов игры, обратитесь к администратору.");
            return "UNEXPECTED";
        }
    } else {
        updateConsole("Данные авторизации неверны, некорректны или сервера не доступны (Код 200)");
        swal({
            title: "Хм...",
            text: "Что-то пошло не так",
            icon: "error",
            timer: 1500,
            button: false,
          });
        launch_button.disabled = false;
        buttonToggle(false);
        return false;
    }
};

function setOptions() {
    let ram = document.getElementById("ram_value");
    let ram_actual = ram.innerHTML.replace(" — ", "");
    ram_actual = ram_actual.replace("GB", "G");

    opts.memory.max = ram_actual;
    opts.memory.min = ram_actual;
    opts.authorization = Authenticator.getAuth(document.getElementById("nickname_placeholder").value)

    updateConsole(`Аргумент RAM: ${ram_actual} (Код 400)`);
};

updateConsole("Консоль подключена к главному процессу/...");

async function launchGame() {

    launch_button.disabled = true;
    buttonToggle(true);

    try {
        
        if(await startupCheck() == "CORRECT"){
            updateConsole("Устанавливаю аргументы запуска (Код 300)");
            setOptions();
            updateConsole("Запускаю клиент... (Код 301)");
            swal({
                title: "Клиент запущен",
                text: "Вы не можете взаимодействовать с лаунчером. Для нового входа перезапустите его.",
                icon: "info",
                button: false,
                closeOnEsc: false,
                closeOnClickOutside: false,
              });
            try {
                launcher.launch(opts);
            }
            catch (e) {
                updateConsole("Лаунчер не смог создать процесс игры. Попробуйте ещё раз или обратитесь к администратору.");
            };
        } else {
            //updateConsole("Лаунчер не завершил проверку необходимых файлов, произошла какая-то ошибка. (Код 101)");
        }
    }
    catch(e) {
        updateConsole("Что-то пошло не так... (Код 100)" + e); // коды, начинающиеся с 1 - проблемы с клиентом, 2 - сервером, 3 - в процессе, 4 - успех
    };
};

let launch_button = document.getElementById("launch-button");
launch_button.onclick = async () => await launchGame();
launcher.on('debug', (e) => updateConsole(`${e}`));
//launcher.on('data', (e) => updateConsole(`${e}`));