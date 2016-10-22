var user, password;

var togglApi = "https://www.toggl.com/api/v8";

function authenticate() {
    var user = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', togglApi + "/me");
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(user + ':' + password));
    xhr.onload = function() {
        if (xhr.status === 200) {
            alert(xhr.response.since);
        }
    };
    xhr.send();
}