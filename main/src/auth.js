async function connectToAuthServers(authData) {
    if(authData.nickname.length > 16 || authData.nickname.length < 3){
        launch_button.disabled = false;
        buttonToggle(false);
        return "NICKNAME_CHECK_FAILED";
    }
    let response = await executeRconCommand(`rcon-auth ${authData.nickname} ${authData.passwordMD5} ${authData.ip} ${authData.launcherVersion} ${authData.uuid}`);
    //updateConsole(response);

    if(response.includes("SUCCESS")){
        Swal.fire({
            title: "Всё отлично!",
            text: "Вы авторизированы",
            icon: "success",
            showConfirmButton: false,
            timer: 1500,
          });
        return "LOGGED_IN"
    } else if (response.includes("REGISTERED")){
        Swal.fire({
            title: "Успешная регистрация",
            text: `Вы создали аккаунт с никнеймом ${authData.nickname}`,
            icon: "info",
            showConfirmButton: false,
          });
        return "LOGGED_IN"
    } else if (response.includes("OUTDATED")) {
        Swal.fire({
            title: "Ваш лаунчер устарел",
            text: `Скачайте установщик новой версии и запустите его`,
            icon: "warning",
            showConfirmButton: false,
          });
        return "OUTDATED"
    } else {
        return "FAILED"
    }
}
