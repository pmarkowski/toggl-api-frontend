// Global vars
var user, password;

var togglApi = "https://www.toggl.com/api/v8";

var millisecondsPerDay = 24 * 60 * 60 * 1000;
var secondsPerHour = 60 * 60;

window.addEventListener('load', initialize);

// Set up event listeners
function initialize() {
    document.getElementById('authenticate').addEventListener('click', authenticate);
    document.querySelectorAll('#authenticate-container input').forEach(element => {
        element.addEventListener('click', authenticate);
    });
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

function emptyDropdown(dropdown) {
    while (dropdown.lastChild) {
        dropdown.removeChild(dropdown.firstChild);
    }
}

function populateDropdown(dropdown, defaultString, valueNamePairs) {
    emptyDropdown(dropdown);
    if (defaultString) {
        addOption(dropdown, null, defaultString);
    }
    valueNamePairs.sort(function (a, b) {
        // Shamelessly stolen from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        var nameA = a.name.toUpperCase(); // ignore upper and lowercase
        var nameB = b.name.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        // names must be equal
        return 0;
    }).forEach(function (element) {
        addOption(dropdown, element.value, element.name);
    });
}

function populateWorkspaces(workspaces) {
    var workspacesDropdown = document.getElementById('workspace');

    var workspacesOptions = workspaces.map(function (element) {
        return {
            value: element.id,
            name: element.name
        };
    });

    populateDropdown(workspacesDropdown, "Select a workspace...", workspacesOptions);
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

    var projectsOptions = projects.map(function (element) {
        return {
            value: element.id,
            name: element.name
        };
    });

    populateDropdown(projectsDropdown, "Select a project...", projectsOptions);
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

    var tasksOptions = tasks.filter(function (element) {
        return element.active;
    }).map(function (element) {
        return {
            value: element.id,
            name: element.name
        };
    });

    populateDropdown(tasksDropdown, "Select a task...", tasksOptions);
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
    return date.getDay() == 6 || date.getDay() == 0;
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