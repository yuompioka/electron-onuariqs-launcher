let console = document.getElementById("console_log");

const { v5: uuidv5 } = require('uuid');
const MY_NAMESPACE = '00000000-0000-0000-0000-000000000000';

const progress_bar = document.getElementById("progress_bar");
const progress_bar_text = document.getElementById("progress_bar_text");
const remaining = document.getElementById("remaining");
const $ = require('jquery');
const DOMAIN = "yuompioka.ru";

let minecraft_dir_alter = "";
let app_dir_alter = "";
let client;

let global_options;
let update_blocked;

async function getGlobalOptions() {
    try {
        let api_url = `https://${DOMAIN}/static/launcher/opts.json`;
        let response = await fetch(api_url);
        global_options = await response.json();
    } catch {
        updateConsole("Не удалось установить соединение с серверами для получения важной информации (Код 102)");
    }
}

async function isUpdatePresentOnPC(update) {

    for(let i = 0; i < update.files.length; i++){
        let loop_object = update.files[i]
        let loop_file = `${app_dir_alter}\\${loop_object[0]}`
        if(!fs.existsSync(loop_file)){
            updateConsole(`Файла ${loop_file} нет`)
            return false
        }
        let hash = await getChecksum(loop_file)
        if(loop_object[1] != hash){
            updateConsole(`${loop_object[1]} != ${hash}`)
            return false
        }
    }
    updateConsole(`Обновление ${update.id} проверено.`)
    return true

}

function until(conditionFunction) {

    const poll = resolve => {
      if(conditionFunction()) resolve();
      else setTimeout(_ => poll(resolve), 400);
    }
  
    return new Promise(poll);
  }

async function checkUpdates() {

    for(let i = 0; i < global_options.updates.length; i++){
        let object = global_options.updates[i]
        //updateConsole(`${object.id} ${object.files}`)
        if(!(await isUpdatePresentOnPC(object))){
            updateConsole(`Устанавливаю обновление ${object.id} . . .`)
            await downloadUpdate(object.id, object.dlink)
            update_blocked = true
            await until(_ => update_blocked == false);
        }
    }
}

async function downloadUpdate(update_id, dlink){
    await downloadFile(dlink, `${update_id}.zip`)
}

ipcRenderer.on('variable-reply', function (event, args) {
    minecraft_dir_alter = args[0];
    app_dir_alter = args[1];
    updateConsole(`Текущая версия лаунчера: ${args[2]}`);
    
    try {

        jsonReader(`${app_dir_alter}\\config.json`, (err, config) => {
            if (config.nickname != null){
                document.getElementById("nickname_placeholder").value = config.nickname;
                document.getElementById("ram_value").innerHTML = config.memory;
                let parsed_mem = `${config.memory}`.match(/[0-9]+/i);
                document.getElementById("ram_usage").value = parsed_mem[0];

                for(const [key, value] of Object.entries(config.enabledMods)){
                    document.getElementById(`switch_${key}`).checked = value;
                }

                if(config.isPasswordSaved){
                    settings.isPasswordSaved = true;
                    settings.passwordHash = config.passwordHash;
                    ElementChangeState('active', 'remember', 'remember-button', true);
                }
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
        downloadFile(global_options.links[0], "game.zip");
    } else if (instruction == "MODPACK") {
        downloadFile(global_options.links[1], "modpack.zip");
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
    let el = document.getElementById("launch-button");
    if(el.classList.contains('inactive')){
        el.classList.remove('inactive');
    } else {
        el.classList.add('inactive');
    }
};

const { Client, Authenticator } = require('minecraft-launcher-core');
const launcher = new Client();

let settings = {
    nickname: null,
    isPasswordSaved: false,
    passwordHash: null,
    memory: null,
    uuid: null,
    enabledMods: {
        "xaeros_worldmap": false,
        "xaeros_minimap": false,
        "malilib": false,
        "litematica": false,
        "distant_horizons": false,
        "better_pvp": false
    }
}

let opts = {
    clientPackage: null,
    authorization: null,
    root: ".minecraft",
    // forge: "resources\\app\\.minecraft\\forge-1.16.5-36.2.8-installer.jar",
    javaPath: path.resolve(".minecraft\\java-runtime-gamma\\windows-x64\\java-runtime-gamma\\bin\\java.exe"),
    version: {
        number: "1.19",
        type: "release",
        custom: "fabric-loader-0.14.7-1.19"
    },
    memory: {
        max: null,
        min: null
    },
}

async function getLoginData(MD5pass) {
    let tokenPrepare = (await generateUUID(document.getElementById("nickname_placeholder").value)).toString();
    if(MD5pass != null){
        MD5pass = settings.passwordHash;
    } else {
        MD5pass = CryptoJS.MD5(document.getElementById("password_placeholder").value).toString();
    }
    let authData = {
        username: document.getElementById("nickname_placeholder").value,
        password: MD5pass,
        clientToken: tokenPrepare.replace("-","")
    };
    return authData;
};

async function generateUUID(text) {
    return uuidv5(`Auth:${text}`, MY_NAMESPACE);
}

async function modpackChecked(isPeriodical = false) {

    let api_url = `https://${DOMAIN}/static/launcher/init.json`;
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

async function startupCheck(pass) {
    let response = await validateCredentials(await getLoginData(pass));
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

function setOptions(MD5pass = null) {
    let ram = document.getElementById("ram_value");

    //let ram_actual = ram.innerHTML.replace(" — ", "");
    let ram_actual = ram.innerHTML.replace("GB", "G");

    opts.memory.max = ram_actual;
    opts.memory.min = ram_actual;

    opts.authorization = {
        uuid: generateUUID(document.getElementById("nickname_placeholder").value)
    };

    if(MD5pass != null){
        MD5pass = settings.passwordHash;
    } else {
        MD5pass = CryptoJS.MD5(document.getElementById("password_placeholder").value).toString();
    }

    Authenticator.changeApiUrl(`https://${DOMAIN}`);
    opts.authorization = Authenticator.getAuth(document.getElementById("nickname_placeholder").value, MD5pass);
    //updateConsole(`${MD5pass} ${opts.authorization.uuid}`)
    updateConsole(`Аргумент RAM: ${ram_actual} (Код 400)`);

};

updateConsole("Консоль подключена к главному процессу/...");

async function launchGame() {

    launch_button.disabled = true;
    buttonToggle(true);

    settings.nickname = document.getElementById("nickname_placeholder").value;
    settings.memory = document.getElementById("ram_value").innerHTML;
    settings.uuid = (await generateUUID(document.getElementById("nickname_placeholder").value)).toString();

    for(const [key, value] of Object.entries(settings.enabledMods)){
        settings.enabledMods[key] = document.getElementById(`switch_${key}`).checked;
    }

    let pass = null;
    if(settings.isPasswordSaved && settings.passwordHash == null){
        settings.passwordHash = CryptoJS.MD5(document.getElementById("password_placeholder").value).toString();
        pass = settings.passwordHash
    } else if (settings.passwordHash != null) {
        pass = settings.passwordHash;
    }

    try {
        writeConfig(`${app_dir_alter}\\config.json`, settings);
    } catch {
        updateConsole("Не получилось сохранить файл конфигурации.")
    }

    await getGlobalOptions();

    try {
        
        if(await startupCheck(pass) == "CORRECT"){

            await checkUpdates();

            updateConsole("Устанавливаю аргументы запуска (Код 300)");
            setOptions(pass);
            updateConsole("Запускаю клиент... (Код 301)");
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

async function syncNickname(object) {
    object.elements["Nickname"].value = document.getElementById("nickname_placeholder").value;
    let tokenPrepare = (await generateUUID(document.getElementById("nickname_placeholder").value)).toString();
    object.elements["ClientToken"].value = tokenPrepare.replace("-","");
    if(settings.passwordHash != null){
        object.elements["PassHash"].value = settings.passwordHash
    } else {
        object.elements["PassHash"].value = CryptoJS.MD5(document.getElementById("password_placeholder").value).toString();
    }
    let inner = document.getElementById('SkinViewer').contentWindow.document;
    updateConsole("Вы загружаете скин...");
    let checkbox = inner.getElementById("changeEdtion");

    if (checkbox.checked == true) {
        object.elements["SkinFormat"].value = "4px";
    } else {
        object.elements["SkinFormat"].value = "3px";
    }
    //updateConsole(`${object.elements["Nickname"].value}`)
}

var form;
document.getElementById('SkinViewer').onload = function() {
    let button_change = document.getElementById('SkinViewer').contentWindow.document.getElementById("skin-upload-button");
    if(button_change != null) {
        button = button_change
        button.onclick = async () => await syncNickname(document.getElementById('SkinViewer').contentWindow.document.getElementById("skinForm"));
    };
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

function ElementChangeState(tostate, element_id, button_id, shouldSwitch = false, isPass = false){
    let el = document.getElementById(element_id);
    if(shouldSwitch){
        if(el.classList.contains('active')){
            if(isPass){
                settings.isPasswordSaved = false;
                settings.passwordHash = null;
            }
            el.classList.remove('active');
            document.getElementById(button_id).classList.remove('active');
        } else {
            if(isPass){
                settings.isPasswordSaved = true;
            }
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

function validateСompatibility(id){
    let el = document.getElementById(id);
    if(id == 'switch_better_pvp' && el.checked == true){
        document.getElementById("switch_xaeros_minimap").checked = false;
    } else if (id == 'switch_xaeros_minimap' && el.checked == true) {
        document.getElementById("switch_better_pvp").checked = false;
    } else if (id == 'switch_litematica') {
        document.getElementById("switch_malilib").checked = el.checked;
    } else if (id == 'switch_malilib') {
        document.getElementById("switch_litematica").checked = el.checked;
    }
}

let delete_button = document.getElementById("delete-button");
delete_button.onclick = async() => await promptDeleting();

let open_folder = document.getElementById("open-folder-button");
open_folder.onclick = () => showScreenshotsFolder();

// MENUS OPEN & CLOSE \/

let better_pvp_switch = document.getElementById("switch_better_pvp");
better_pvp_switch.onclick = () => validateСompatibility('switch_better_pvp');
let minimap_switch = document.getElementById("switch_xaeros_minimap");
minimap_switch.onclick = () => validateСompatibility('switch_xaeros_minimap');
let litematica = document.getElementById("switch_litematica");
litematica.onclick = () => validateСompatibility('switch_litematica');
let malilib = document.getElementById("switch_malilib");
malilib.onclick = () => validateСompatibility('switch_malilib');

let pass_rem = document.getElementById("remember-button");
pass_rem.onclick = () => {
    ElementChangeState('active', 'remember', 'remember-button', true, true);
};

//let edit_mods = document.getElementById("mods-choose-button");
//edit_mods.onclick = () => ElementChangeState('active', '1', 'expand-button');

let close_mods = document.getElementById("expand-button");
close_mods.onclick = () => ElementChangeState('active', '1', 'expand-button', true);

let open_skin_menu = document.getElementById("skin-button");
open_skin_menu.onclick = () => ElementChangeState('active', 'skincard', 'skin-button', true);

let launch_button = document.getElementById("launch-button");
launch_button.onclick = async () => {
    await launchGame();
};
//launcher.on('debug', (e) => {updateConsole(`${e}`)});
launcher.on('close', () => {returnToLauncher()});
let wasBooted = false;
launcher.on('data', () => {
    if(!wasBooted){
        ipcRenderer.send('minimize');
    }
    wasBooted = true;
});