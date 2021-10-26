async function connectToAuthServers(authData) {
    if(authData.nickname.length > 16 || authData.nickname.length < 3){
        launch_button.disabled = false;
        buttonToggle(false);
        return "NICKNAME_CHECK_FAILED";
    }

    let response = await executeRconCommand(`rcon-auth ${authData.nickname} ${authData.passwordMD5} ${authData.ip}`);
    //updateConsole(response);

    if(response.includes("SUCCESS")){
        swal({
            title: "Всё отлично!",
            text: "Вы авторизированы",
            icon: "success",
            button: false,
            timer: 1500,
          });
        return "LOGGED_IN"
    } else if (response.includes("REGISTERED")){
        swal({
            title: "Успешная регистрация",
            text: `Вы создали аккаунт с никнеймом ${authData.nickname}`,
            icon: "info",
            button: false,
          });
        return "LOGGED_IN"
    } else {
        return "FAILED"
    }
}
