let console = document.getElementById("console_log");

const publicIp = require('public-ip');

function updateConsole(text){
    let before = console.innerHTML;
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
    authorization: Authenticator.getAuth("username"),
    root: ".minecraft",
    version: {
        number: "1.16.5",
        type: "release"
    },
    memory: {
        max: null,
        min: null
    }
}

function getLoginData() {
    let authData = {
        nickname: document.getElementById("nickname_placeholder").value,
        passwordMD5: CryptoJS.MD5(document.getElementById("password_placeholder").value).toString(),
    };
    return authData;
};

function modpackChecked() {
    return true;
};

function startupCheck() {
    let response = connectToAuthServers(getLoginData());
    if(response.includes("LOGGED_IN")) {
        if(modpackChecked()) {
            return true;
        } else {
            updateConsole("Модпак не установлен или повреждён (Код 101)");
            return false;
        }
    } else {
        updateConsole("Данные авторизации неверны или сервера не доступны (Код 200)");
        return false;
    }
};

function setRam() {
    let ram = document.getElementById("ram_value");
    let ram_actual = ram.innerHTML.replace(" — ", "");
    ram_actual = ram_actual.replace("GB", "G");
    opts.memory.max = ram_actual;
    opts.memory.min = ram_actual;
    updateConsole(`Аргумент RAM: ${ram_actual} (Код 400)`);
};

updateConsole("Консоль подключена к главному процессу/...");

function launchGame() {
    try {
        if(startupCheck()){
            updateConsole("Устанавливаю аргументы RAM (Код 300)");
            setRam();
            updateConsole("Запускаю клиент... (Код 301)");
            opts.nickname = document.getElementById("nickname_placeholder").value;
            launcher.launch(opts);
            launch_button.disabled = true;
            buttonToggle(true);
        } else {
            updateConsole("Похоже, модпак не установлен или установлен неправильно. (Код 101)");
        }
    }
    catch(e) {
        updateConsole("Что-то пошло не так... (Код 100)"); // коды, начинающиеся с 1 - проблемы с клиентом, 2 - сервером, 3 - в процессе, 4 - успех
    };
};

let launch_button = document.getElementById("launch-button");
launch_button.onclick = () => launchGame();
//launcher.on('debug', (e) => updateConsole(`${e}`));
//launcher.on('data', (e) => updateConsole(`${e}`));