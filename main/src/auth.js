async function connectToAuthServers(authData) {
    if(authData.nickname.length > 16 || authData.nickname.length < 3){
        return "NICKNAME_CHECK_FAILED";
    }
    return "LOGGED_IN"
}
