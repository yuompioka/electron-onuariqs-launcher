let url = 'http://localhost:8080/init.json';

fetch(url)
.then(res => res.json())
.then(out => updateConsole(`${out.prod_version}`))