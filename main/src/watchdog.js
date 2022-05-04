async function sendReportToServer(state){
    let url = "https://yuompioka.ml/session/minecraft/modpackValidate";

    let params = {
        headers: {
            "content-type":"application/json; charset=UTF-8"
        },
        body: JSON.stringify({auth: JSON.stringify(await opts.authorization), state: state}),
        method: "POST"
    };
    window.console.log(params);
    await fetch(url,params);
}

async function AntiCheatIterate(){
    let state = await modpackChecked(true);
    await sendReportToServer(state);
}

async function startMonitoring(){
    setInterval(async () => await AntiCheatIterate(), 1000 * 30);
};