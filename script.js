// Global vars
var user, password;

var togglApi = "https://www.toggl.com/api/v8";

window.addEventListener('load', initialize);

// Set up event listeners
function initialize() {
    document.getElementById('authenticate').addEventListener('click', authenticate);
    document.getElementById('workspace').addEventListener('change', workspaceChanged);
    document.getElementById('project').addEventListener('change', projectChanged);
}

// Functions
function togglGet(user, password, endpoint, success) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', togglApi + endpoint);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(user + ':' + password));
    xhr.onload = function () {
        if (xhr.status === 200) {
            var response = JSON.parse(xhr.response);
            if (response) {
                success(response);
            }
        }
    }

    xhr.send();
}

function authenticate() {
    user = document.getElementById('username').value;
    password = document.getElementById('password').value;

    togglGet(user, password, "/me", function(response) {
        populateWorkspaces(response.data.workspaces);
    });
}

function addOption(dropdown, value, name) {
    var optionElement = document.createElement("option");
    optionElement.value = value;
    optionElement.textContent = name;
    dropdown.appendChild(optionElement);
}

function populateWorkspaces(workspaces) {
    var workspacesDropdown = document.getElementById('workspace');

    addOption(workspacesDropdown, null, "Select a workspace...");

    for (var i = 0; i < workspaces.length; i++) {
        addOption(workspacesDropdown, workspaces[i].id, workspaces[i].name);
    }
}

function workspaceChanged() {
    var workspacesDropdown = document.getElementById('workspace');
    var workspaceId = workspacesDropdown.value;

    togglGet(user, password, "/workspaces/" + workspaceId + "/projects", function (response) {
        populateProjects(response);
    });
}

function populateProjects(projects) {
    var projectsDropdown = document.getElementById('project');

    addOption(projectsDropdown, null, 'Select a project...');

    for (var i = 0; i < projects.length; i++) {
        addOption(projectsDropdown, projects[i].id, projects[i].name);
    }
}

function projectChanged() {
    var projectsDropdown = document.getElementById('project');
    var projectId = projectsDropdown.value;

    togglGet(user, password, "/projects/" + projectId + "/tasks", function (response) {
        populateTasks(response);
    });
}

function populateTasks(tasks) {
    var tasksDropdown = document.getElementById('task');
    addOption(tasksDropdown, null, "Select a task...");

    for (var i = 0; i < tasks.length; i++) {
        addOption(tasksDropdown, tasks[i].id, tasks[i].name);
    }
}