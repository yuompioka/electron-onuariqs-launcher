async function validateCredentials(authData) {
    let url = `https://${DOMAIN}/credentials/validate`;

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
                title: "Всё отлично!",
                text: "Вы авторизированы",
                icon: "success",
                showConfirmButton: false,
                timer: 1500,
              });
            return "LOGGED_IN"
        } else {
            return "FAILED"
        }
    } else {
        return "FAILED"
    }

}