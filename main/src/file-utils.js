function loadFile(url) {
    let ajax = new XMLHttpRequest();
    ajax.responseType = "blob";
    ajax.open("GET", url, true);
    ajax.send();

    let progress_bar = document.getElementById("progress_bar");
    let progress_bar_text = document.getElementById("progress_bar_text");
    let remaining = document.getElementById("remaining");

    let start = new Date().getTime();

    ajax.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let obj = window.URL.createObjectURL(this.response);
            setTimeout(function() {
                window.URL.revokeObjectURL(obj);
            }, 60 * 1000);
        };
    };

    ajax.onprogress = function (e) {
        progress_bar.max = e.total;
        progress_bar.value = e.loaded;

        let percent = (e.loaded / e.total) * 100;
        percent = Math.floor(percent);
        progress_bar_text.innerHTML = percent + "%";

        let end = new Date().getTime();
        var duration = (end - start) / 1000;
        let bps = e.loaded / duration;
        var kbps = bps / 1024;
        kbps = Math.floor(kbps);

        remaining.innerHTML = kbps + " KB/s";
    };

    ajax.onload = function (e) {
        var blob = e.currentTarget.response;
        saveBlob(blob, "C:/electron-launcher/main/downloaded.ino");};
};

function saveBlob(blob, fileName) {
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.dispatchEvent(new MouseEvent('click'));
}