let console = document.getElementById("console_log");

const { v5: uuidv5 } = require('uuid');
const MY_NAMESPACE = '00000000-0000-0000-0000-000000000000';

const progress_bar = document.getElementById("progress_bar");
const progress_bar_text = document.getElementById("progress_bar_text");
const remaining = document.getElementById("remaining");
const $ = require('jquery');

let minecraft_dir_alter = "";
let app_dir_alter = "";
let client;

ipcRenderer.on('variable-reply', function (event, args) {
    minecraft_dir_alter = args[0];
    app_dir_alter = args[1];
    updateConsole(`Текущая версия лаунчера: ${args[2]}`);
    
    try {

        jsonReader(`${app_dir_alter}\\config.json`, (err, config) => {
            if (config.nickname != null){
                document.getElementById("nickname_placeholder").value = config.nickname;
                document.getElementById("ram_value").innerHTML = config.memory;

                document.getElementById("switch_xaeros_minimap").checked = config.enabledMods['xaeros_minimap'];
                document.getElementById("switch_xaeros_worldmap").checked = config.enabledMods['xaeros_worldmap'];
                document.getElementById("switch_litematica").checked = config.enabledMods['litematica'];
                document.getElementById("switch_malilib").checked = config.enabledMods['malilib'];
                document.getElementById("switch_better_pvp").checked = config.enabledMods['better_pvp'];
                document.getElementById("switch_inventory_tweaks").checked = config.enabledMods['inventory_tweaks'];
            }
        })

    } catch(e) {
        window.console.log(e);
    }
});

const crypto = require('crypto');

function getChecksum(path) {
    return new Promise((resolve, reject) => {
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
        downloadFile("https://yuompioka.ml/static/launcher/game.zip", "game.zip");
    } else if (instruction == "MODPACK") {
        downloadFile("https://yuompioka.ml/static/launcher/modpack.zip", "modpack.zip");
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

let settings = {
    nickname: null,
    memory: null,
    uuid: null,
    enabledMods: {
        "xaeros_worldmap": false,
        "xaeros_minimap": false,
        "malilib": false,
        "litematica": false,
        "better_pvp": false,
        "inventory_tweaks": false
    }
}

let opts = {
    clientPackage: null,
    authorization: null,
    root: ".minecraft",
    // forge: "resources\\app\\.minecraft\\forge-1.16.5-36.2.8-installer.jar",
    javaPath: path.resolve(".minecraft\\jdk-17.0.1\\bin\\java.exe"),
    version: {
        number: "1.18.2",
        type: "release",
        custom: "fabric-loader-0.13.3-1.18.2"
    },
    memory: {
        max: null,
        min: null
    },
}

async function getLoginData() {
    let tokenPrepare = (await generateUUID(document.getElementById("nickname_placeholder").value)).toString();
    let authData = {
        username: document.getElementById("nickname_placeholder").value,
        password: CryptoJS.MD5(document.getElementById("password_placeholder").value).toString(),
        ip: user_ip,
        clientToken: tokenPrepare.replace("-","")
    };
    return authData;
};

async function generateUUID(text) {
    return uuidv5(`Auth:${text}`, MY_NAMESPACE);
}

async function modpackChecked(isPeriodical = false) {

    let api_url = "https://yuompioka.ml/static/launcher/init.json";
    let response = await fetch(api_url);
    let data = await response.json();
    
    if(!isPeriodical){updateConsole(data.use)}

    let newest_client_version = data.prod_version;
    let client = `${minecraft_dir_alter}\\client_version-${newest_client_version}.ino`;
    if (!fs.existsSync(client)) {
        return "GAME_NOT_INSTALLED";
    };
    
    // check resourcepack
    let res_zip = `${minecraft_dir_alter}\\resourcepacks\\_cit-version.zip`;

    let hash_0 = ""; //await getChecksum(res_zip);

    if (hash_0 !== data.resourcepack_MD5) {
        // return "RESOURCEPACK_UPDATE";
    }

    let iter_file = null;

    // check all files in mods \/

    let files = await fs.promises.readdir( `${minecraft_dir_alter}\\mods` );
    let customModsFound = false;
    for( const file of files ) {
        iter_file = `${minecraft_dir_alter}\\mods\\${file}`;
        window.console.log(`${data.required_mods[`${file}`]} ${file}`)
        if(data.required_mods[`${file}`] == null){
            if(isPeriodical){
                return "CUSTOM_MOD_DETECTED";
            }
            try{fs.rmSync(iter_file)} catch{};
            customModsFound = true
        }
    }

    // check modpack \/
    for (let [key, value] of Object.entries(data.required_mods)) {
        iter_file = `${minecraft_dir_alter}\\mods\\${key}`;

        if (!fs.existsSync(iter_file) && value[0]!="NO_HASH" && value[0]!="OPTIONAL_MOD") {
            return "MODPACK_CORRUPTED";
         } else if (!fs.existsSync(iter_file) && value[0]=="NO_HASH"){
            // pass
         } else if (value[0]=="OPTIONAL_MOD"){
             
            let current_mod = key.replace(".jar","")
            if (!fs.existsSync(iter_file) && settings.enabledMods[`${current_mod}`]){
                return "MODPACK_CORRUPTED"
            }
            if (fs.existsSync(iter_file) && !settings.enabledMods[`${current_mod}`]){
                deleteGameFile(`mods\\${current_mod}.jar`)
            }
            try {
                let hash = await getChecksum(iter_file);
                window.console.log(hash);
                if (hash !== value[1] && hash != null){
                    return "MODPACK_CORRUPTED";
                }
            } catch {
                // do nothing, mod file is probably deleted & disabled
            };

         } else {
            // check file MD5 hash

            let hash = await getChecksum(iter_file)

            if (hash !== value[0]) {
                try{
                    fs.rmSync(iter_file);
                } catch(e){};
                if(!isPeriodical){updateConsole(`${hash}`)}
                if (value[0]!="NO_HASH") {
                    return "MODPACK_CORRUPTED";
                };
            };
        };
        if(!isPeriodical){updateConsole(`${key} проверен.`, true)}
    };

    return "MODPACK_CORRECT";

};

async function startupCheck() {
    let response = await validateCredentials(await getLoginData());
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
        } else {
            updateConsole("Не удалось проверить целостность файлов игры, обратитесь к администратору.");
            return "UNEXPECTED";
        }
    } else {
        updateConsole("Данные авторизации неверны, некорректны или сервера не доступны (Код 200)");
        Swal.fire({
            title: "Хм...",
            text: "Что-то пошло не так",
            icon: "error",
            timer: 1500,
            showConfirmButton: false,
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

    opts.authorization = {
        uuid: generateUUID(document.getElementById("nickname_placeholder").value)
    };

    Authenticator.changeApiUrl("https://yuompioka.ml");
    let MD5pass = CryptoJS.MD5(document.getElementById("password_placeholder").value).toString();
    opts.authorization = Authenticator.getAuth(document.getElementById("nickname_placeholder").value, MD5pass);
    updateConsole(`${MD5pass} ${opts.authorization.uuid}`)
    updateConsole(`Аргумент RAM: ${ram_actual} (Код 400)`);

};

updateConsole("Консоль подключена к главному процессу/...");

async function launchGame() {

    launch_button.disabled = true;
    buttonToggle(true);

    settings.nickname = document.getElementById("nickname_placeholder").value;
    settings.memory = document.getElementById("ram_value").innerHTML;
    settings.uuid = (await generateUUID(document.getElementById("nickname_placeholder").value)).toString();
    settings.enabledMods['xaeros_minimap'] = document.getElementById("switch_xaeros_minimap").checked;
    settings.enabledMods['xaeros_worldmap'] = document.getElementById("switch_xaeros_worldmap").checked;
    settings.enabledMods['litematica'] = document.getElementById("switch_litematica").checked;
    settings.enabledMods['malilib'] = document.getElementById("switch_malilib").checked;
    settings.enabledMods['better_pvp'] = document.getElementById("switch_better_pvp").checked;
    settings.enabledMods['inventory_tweaks'] = document.getElementById("switch_inventory_tweaks").checked;

    try {
        writeConfig(`${app_dir_alter}\\config.json`, settings);
    } catch {
        updateConsole("Не получилось сохранить файл конфигурации.")
    }

    try {
        
        if(await startupCheck() == "CORRECT"){
            updateConsole("Устанавливаю аргументы запуска (Код 300)");
            setOptions();
            updateConsole("Запускаю клиент... (Код 301)");
            Swal.fire({
                title: "Minecraft скоро запустится, ожидайте",
                text: "Не закрывайте лаунчер, иначе сессия будет сброшена.",
                icon: "info",
                showConfirmButton: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                allowOutsideClick: false,
              });
            try {
                client = await launcher.launch(opts);
                await startMonitoring();
                await AntiCheatIterate();
            }
            catch (e) {
                window.console.log(e);
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
async function uploadSkinProcess(authData) {
    let inner = document.getElementById('SkinViewer').contentWindow.document;
    updateConsole("Вы загружаете скин...");
    let checkbox = inner.getElementById("changeEdtion");

    if (checkbox.checked == true) {
        authData.skinFormat = "4px";
    } else {
        authData.skinFormat = "3px";
    }


    let url = "https://yuompioka.ml/upload";

    let params = {
        headers: {
            "content-type":"application/json; charset=UTF-8"
        },
        body: JSON.stringify(authData),
        method: "POST"
    };
    window.console.log(params);
    let response = await fetch(url,params);

    if (response.ok) {
        let json = await response.json();
        window.console.log(json);
        if(json.status == "OK") {
            Swal.fire({
                title: "Пробуем загрузить...",
                text: "Процесс установки скина инициализирован. Следуйте дальнейшим инструкциям в окне установки скина",
                icon: "info",
                showConfirmButton: false
              });
        } else {
            Swal.fire({
                title: "Эй!",
                text: "Вы не можете установить скин не для своего аккаунта (или сервера не доступны)",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
              });
    }};

}

function syncNickname(object) {
    object.elements["Nickname"].value = document.getElementById("nickname_placeholder").value;
    //updateConsole(`${object.elements["Nickname"].value}`)
}

var form;
document.getElementById('SkinViewer').onload = function() {
    let change_to = document.getElementById('SkinViewer').contentWindow.document.getElementById("skinForm");
    let button_change = document.getElementById('SkinViewer').contentWindow.document.getElementById("skin-upload-button");
    if(button_change != null) {
        button = button_change
        button.onclick = () => syncNickname(document.getElementById('SkinViewer').contentWindow.document.getElementById("skinForm"));
    }
    if(change_to != null){
        form = change_to
        form.onsubmit = async() => await uploadSkinProcess(await getLoginData());
    }
};

async function promptDeleting() {
    Swal.fire({
        title: 'Вы уверены, что хотите удалить игру?',
        text: "Будут удалены: директория с игрой, все ваши логи и скриншоты, которые вы сделали на сервере",
        icon: 'question',
        showCancelButton: true,
        cancelButtonText: "Не удалять",
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Да, удалить'
      }).then((result) => {
        if (result.isConfirmed) {
            try{deleteGameDir();}catch{
                Swal.fire({
                    title: 'Ой!',
                    text: 'Не получилось удалить директорию игры автоматически...',
                    icon: 'error',
                    showConfirmButton: false,
                  })
            };
        }
      })
}

function ElementChangeState(tostate, element_id, button_id, shouldSwitch = false){
    let el = document.getElementById(element_id);
    if(shouldSwitch){
        if(el.classList.contains('active')){
            el.classList.remove('active');
            document.getElementById(button_id).classList.remove('active');
        } else {
            el.classList.add('active');
            document.getElementById(button_id).classList.add('active');
        }
        return;
    }
    if(tostate=="active"){
        el.classList.add('active');
        document.getElementById(button_id).classList.add('active');
    } else {
        el.classList.remove('active');
        document.getElementById(button_id).classList.remove('active');
    }
}

let delete_button = document.getElementById("delete-button");
delete_button.onclick = async() => await promptDeleting();

let open_folder = document.getElementById("open-folder-button");
open_folder.onclick = () => showScreenshotsFolder();

// MENUS OPEN & CLOSE \/

let edit_mods = document.getElementById("mods-choose-button");
edit_mods.onclick = () => ElementChangeState('active', '1', 'expand-button');

let close_mods = document.getElementById("expand-button");
close_mods.onclick = () => ElementChangeState('inactive', '1', 'expand-button');

let open_skin_menu = document.getElementById("skin-button");
open_skin_menu.onclick = () => ElementChangeState('active', 'skincard', 'skin-button', true);

let launch_button = document.getElementById("launch-button");
launch_button.onclick = async () => await launchGame();
launcher.on('debug', (e) => {updateConsole(`${e}`)});
//launcher.on('data', (e) => checkForPID(`PID = ${e}`));