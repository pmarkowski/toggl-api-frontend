// Global vars
var user, password;

var togglApi = "https://www.toggl.com/api/v8";

var millisecondsPerDay = 24 * 60 * 60 * 1000;
var secondsPerHour = 60 * 60;

window.addEventListener('load', initialize);

// Set up event listeners
function initialize() {
    document.getElementById('authenticate').addEventListener('click', authenticate);
    document.getElementById('workspace').addEventListener('change', workspaceChanged);
    document.getElementById('project').addEventListener('change', projectChanged);
    document.getElementById('submit-time-entries').addEventListener('click', createTimeEntries);
}

// Functions
function error(message) {
    var errorDiv = document.getElementById('error');

    var errorSpan = document.createElement('span');
    errorSpan.innerText = message;

    errorDiv.innerHTML = errorSpan.outerHTML;
}

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
        } else {
            error('Error calling Toggl API!');
        }
    }

    xhr.send();
}

function togglJsonPost(user, password, endpoint, data, success) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', togglApi + endpoint);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(user + ':' + password));
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
        if (xhr.status === 200) {
            var response = JSON.parse(xhr.response);
            if (response) {
                if (success) {
                    success(response);
                }
            }
        } else {
            error('Error calling Toggl API!');
        }
    }

    xhr.send(JSON.stringify(data));
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

function dateFromDateAndTimeInputStrings(date, time) {
    var year = date.substring(0, 4);
    // Subtract one since JS months are 0 indexed
    var month = date.substring(5, 7) - 1;
    var date = date.substring(8, 10);
    var hours = time.substring(0, 2);
    var minutes = time.substring(3, 5);

    return new Date(year, month, date, hours, minutes);
}

function isWeekend(date) {
    return date.getDay() == 6 || date.getDay() == 7;
}

function createTimeEntries() {
    var taskId = parseInt(document.getElementById('task').value);
    var description = document.getElementById('description').value;
    var billable = document.getElementById('billable').value === 'true';
    var startTime = document.getElementById('start-time').value;
    var durationH = document.getElementById('duration').value;
    // var endTime = document.getElementById('end-time').value;
    var startDateString = document.getElementById('start-date').value;
    var endDateString = document.getElementById('end-date').value;
    var skipWeekends = document.getElementById('skip-weekends').value;

    var startDate, endDate;

    startDate = dateFromDateAndTimeInputStrings(startDateString, startTime);

    if (endDateString) {
        endDate = dateFromDateAndTimeInputStrings(endDateString, startTime);
    }

    var numDayEntries;
    if (endDate) {
        numDayEntries = (endDate - startDate) / millisecondsPerDay;
    } else {
        numDayEntries = 1;
    }

    var postObject = {
        "time_entry": {
            "description": description,
            "tid": taskId,
            "billable": billable,
            "start": null,
            "duration": durationH * secondsPerHour,
            "created_with": 'Toggl API Frontend'
        }
    };

    for (var i = 0; i <= numDayEntries; i++) {
        var postDate = new Date(startDate);
        postDate.setDate(startDate.getDate() + i);

        if (skipWeekends && isWeekend(postDate)) {
            continue;
        }

        postObject.time_entry.start = postDate.toISOString();

        togglJsonPost(user, password, '/time_entries', postObject, function () {
            document.getElementById('success-text').innerText += 'Successfully POSTed for ' + postDate + '\n';
        });
    }
}