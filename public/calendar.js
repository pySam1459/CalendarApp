// CONSTANTS
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const suffixes = ["st", "nd", "rd"];

// GLOBALS
let calendar = {};

let calOffset = 0;
let selectedDate = null;

// CALENDAR LOADING
// application entry point
function init () {
    showCalendarSelect();

    // if user was using a previous calendar, load that one
    if (getStorage("name") && getStorage("code")) {
        loadCalendar(getStorage("name"), getStorage("code"));
    }
}

function showCalendarSelect () {
    document.getElementById("calendar").hidden = true;
    document.getElementById("calendar-select").hidden = false;
    document.getElementById("calendar-select-warning").hidden = true;
    document.getElementById("calendar-delete-but2")?.remove();
}

// 1a.
// Uses ajax to get the calendar data of a specific user, by name
async function loadCalendar (name, code) {
    const xhr = new XMLHttpRequest();

    xhr.open("GET", `calendar?name=${name}&code=${code}`, true);

    xhr.onload = function () {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
            calendar = response;
            initCalendar();
        } else if (response.error) {
            setSelectWarning(response.error);
        }
    };

    xhr.onerror = function () {
        if (xhr.status === 0) {
            setSelectWarning("Connection to server refused");
        } else {
            setSelectWarning("An Error Occurred : Code " + xhr.status);
        }
    };

    xhr.send();
}

// 1b.
// Uses ajax to post the details of a new calendar
function newCalendar (name, code) { // eslint-disable-line no-unused-vars
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "new", true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");

    xhr.onload = function () {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
            calendar = response;
            initCalendar();
        } else if (response.error) {
            setSelectWarning(response.error);
        }
    };

    xhr.onerror = function () {
        if (xhr.status === 0) {
            setSelectWarning("Connection to server refused");
        } else {
            setSelectWarning("An Error Occurred : Code " + xhr.status);
        }
    };

    code = code || undefined;
    xhr.send(JSON.stringify({ name, code }));
}

// 1c. Deletes a calendar
function deleteCalendar (name, code) {
    if (!name || !code) {
        setSelectWarning("Please provide a calendar name and code");
        document.getElementById("calendar-delete-but2")?.remove();
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("DELETE", `delete?name=${name}&code=${code}`, true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            setSelectWarning("Calendar Deleted!", "green");
            document.getElementById("calendar-name-input").value = "";
            document.getElementById("calendar-code-input").value = "";
        } else {
            setSelectWarning(JSON.parse(xhr.responseText).error);
        }
        document.getElementById("calendar-delete-but2")?.remove();
    };

    xhr.onerror = function () {
        if (xhr.status === 0) {
            setSelectWarning("Connection to server refused");
        } else {
            setSelectWarning("An Error Occurred : Code " + xhr.status);
        }
    };

    xhr.send();
}

// onclick event for deleting a calendar, eslint disabled as func is used in html
function deleteCalenderBut () { // eslint-disable-line no-unused-vars
    if (document.getElementById("calendar-delete-but2")) return; // already exists

    const deletebut2 = createElement("button", {
        id: "calendar-delete-but2",
        class: "btn btn-sm btn-outline-danger"
    });
    deletebut2.innerText = "Are You Sure?";
    deletebut2.onclick = () => calendarAction(deleteCalendar);
    document.getElementById("calendar-delete-buttons").append(deletebut2);
}

// shows a warning for the given warning element (both on select and entry form)
function setWarning (elId, text, color) {
    const warning = document.getElementById(elId);
    warning.style.color = color;
    warning.innerText = text;
    warning.hidden = false;

    // some nice animations
    setTimeout(() => {
        warning.animate([{ opacity: 0, transition: "opacity 2s linear" }], // fade out
                         { duration: 2000, iterations: 1 });
    }, 3000);
    setTimeout(() => { warning.hidden = true; }, 5000); // hide after 5 seconds
}

function setSelectWarning (text, color = "red") { // for the select page
    setWarning("calendar-select-warning", text, color);
}
function setEntryWarning (text, color = "green") { // for the entry form
    setWarning("entry-warning", text, color);
}

// gets the calendar name & password, forwards it on to the specified action
async function calendarAction (func) {
    const name = document.getElementById("calendar-name-input").value;
    const code = document.getElementById("calendar-code-input").value;
    func(name, code);
}

// 2.
// After calendar has been selected, init calendar and render
function initCalendar () {
    if (!calendar) return;

    calOffset = getStorage("offset") ? parseInt(getStorage("offset")) : 0;
    renderCalendar();
}

// once the page is selected, return to same page if user exits browser
function setLocalStorage () {
    setStorage("name", calendar.name);
    setStorage("code", calendar.code);
    setStorage("offset", calOffset);
}

// 3.
// Renders the calendar given the data provided
// uses DOM manipulation to add the grid to the html
function renderCalendar () {
    setLocalStorage();

    document.getElementById("calendar-name").innerText = calendar.name;
    document.getElementById("calendar-code").innerText = calendar.code;

    // set the calendar so that the dates match up with the days and get current date
    const cdate = getDate();
    document.getElementById("month-header").innerText = `${monthNames[cdate.month]} ${cdate.year}`;

    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    hideCellEntries();

    // creating the calendar grid, max 6 rows
    for (let row = 0; row < 6; row++) {
        const rowDiv = createElement("div", { class: "row cell-row d-flex justify-content-center" });

        for (let col = 0; col < 7; col++) {
            rowDiv.append(createCell(row, col, cdate));
            cdate.date.setDate(cdate.date.getDate() + 1);
        }
        grid.append(rowDiv);

        if (cdate.date.getMonth() !== cdate.month) break;
    }

    document.getElementById("calendar-select").hidden = true;
    document.getElementById("calendar").hidden = false;
}

// returns the relevant info regarding the calendar dates
function getDate () {
    const date = new Date();
    date.setMonth(date.getMonth() + calOffset);

    const month = date.getMonth(); // to get the current month
    const year = date.getFullYear();

    date.setDate(1);
    const d = date.getDay();
    date.setDate(d !== 0 ? (2 - d) : -5); // create the offset so that the day matches up with the date

    return { date, month, year }; // date object, current month, current year
}

// creates an single cell given row:col and the date
function createCell (row, col, cdate) {
    const cellNum = (row + col) % 2;
    const cellType = `cell-color-${cellNum + 1}`;

    const cellData = calendar.entries[dateStringify(cdate.date)]; // get the data for this specific day from the calendar
    if (cellData) cellData.sort(compareEntries);

    const cell = createElement("div", {
        class: `col-md-1 cell ${cellType}`,
        "data-date": dateStringify(cdate.date)
    });

    cell.classList.add("cell-hover");
    cell.onclick = onCellClick;

    const dateDiv = createElement("div", { class: "date" }); // add the date to the top
    dateDiv.innerText = dateBeautify(cdate.date);
    if (cdate.date.getMonth() !== cdate.month) {
        dateDiv.style.color = "#999";
        cell.style["background-color"] = cellNum ? "#c7d9e6" : "#fffffe";
    }
    cell.append(dateDiv);

    if (cellData) { // if there is an appointment on this day, add the appointment to the cell
        const cellInner = createCellInner(cellData);
        cell.append(cellInner);
    }
    return cell;
}

// converts date object to {date}{suffix} {month}
function dateBeautify (date) {
    let suffix = "th";
    const dayUnit = date.getDate() % 10;
    if (dayUnit > 0 && dayUnit <= 3 && Math.floor(date.getDate() / 10) !== 1) {
        suffix = suffixes[dayUnit - 1];
    }
    return `${date.getDate()}${suffix} ${monthShort[date.getMonth()]}`;
}

// formats date object to dd-mm-yyyy
function dateStringify (date) {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

// this function creates the div for the inner text of a cell
function createCellInner (data) {
    const textDiv = createElement("div", { class: "cell-inner" });
    for (const entry of data) {
        const titleDiv = createElement("div", { class: "cell-entry" });

        if (typeof entry === "string") { // no times specified + compat with previous design
            titleDiv.innerText = entry;
        } else {
            titleDiv.innerText = entry.text;

            if (entry.start || entry.end) { // if start/end is specified
                const timeDiv = createElement("div", { class: "cell-time-div" });
                timeDiv.innerText = formatEntryTime(entry);
                textDiv.append(timeDiv);
            }
        }

        textDiv.append(titleDiv);
    }
    if (textDiv.lastChild) { // removes the dotted line from the last Entries element
        textDiv.lastChild.style.border = "none";
    }

    return textDiv;
}

// format time to fit 'start-end', 'start-', '-end'
function formatEntryTime (entry) {
    if (!entry.start && !entry.end) return "";

    let time = "";
    if (entry.start) {
        time += `${entry.start}`;
    }
    time += "-";
    if (entry.end) {
        time += `${entry.end}`;
    }
    return time;
}

// a custom element creator for elements with multiple classes
function createElement (element, attribs) {
    const el = document.createElement(element);
    for (const attr in attribs) {
        el.setAttribute(attr, attribs[attr]);
    }
    return el;
}

// called by the exit button, returns to calendar select
function exitBut () { // eslint-disable-line no-unused-vars
    localStorage.clear();
    showCalendarSelect();
}

// if a month adjust arrow is pressed
function monthAdj (inc) { // eslint-disable-line no-unused-vars
    calOffset += inc;
    renderCalendar();
}

// ENTRY FUNCTIONS
// Returns the cell div (sometimes the mouse-event's target is the inner-divs)
function getDivFromMouseEvent (event) {
    let div = event.target;
    while (!div.classList.contains("cell")) {
        div = div.parentElement;
    }

    return div;
}

// function is called when cell is clicked
function onCellClick (event) {
    const div = getDivFromMouseEvent(event);
    if (div.dataset.date === selectedDate) { // if selected cell is clicked, unselect it
        removeCellHighlight();
        selectedDate = null;
        hideCellEntries();
    } else {
        selectedDate = div.dataset.date;
        highlightCell(div);
        showCellEntries();
    }
}

function highlightCell (div) {
    removeCellHighlight();
    div.classList.add("cell-highlight");
}

function removeCellHighlight () {
    document.querySelectorAll(".cell").forEach((cell) => {
        cell.classList.remove("cell-highlight");
    });
}

// show entries when cell is clicked
function showCellEntries () {
    hideCellEntries();

    const entryData = calendar.entries[selectedDate];
    console.log(entryData);

    document.getElementById("entry-labels").style.visibility = entryData ? "visible" : "hidden";
    if (entryData) {
        entryData.sort(compareEntries);
        for (const entry of entryData) {
            createNewEntry(entry);
        }
    }

    const entries = document.getElementById("entries");
    document.getElementById("entry-info").innerHTML = `Entries for <span style="font-weight:bold">${selectedDate}</span>`;

    const entryAddBut = createElement("button", {
        class: "col-md-6 btn btn-outline-secondary",
        id: "entry-add-but"
    });
    entryAddBut.innerText = "Add New Entry";
    entryAddBut.onclick = () => createNewEntry(null);

    const entrySubmitBut = createElement("button", {
        class: "col-md-1 btn btn-success",
        id: "entry-submit-but"
    });
    entrySubmitBut.innerText = "Save";
    entrySubmitBut.onclick = saveEntries;

    document.getElementById("entry-add-div")?.append(entryAddBut, entrySubmitBut);

    entries.hidden = false;
}

// Creates a new Entry field and its deletion button
function createNewEntry (entry) {
    const newEntryBox = createElement("div", { class: "row flex-nowrap entry-box d-flex justify-content-center" });

    const newTimeStart = createElement("input", {
        class: "col-md-1 entry-time-box start",
        type: "time"
    });
    const newTimeEnd = createElement("input", {
        class: "col-md-1 entry-time-box end",
        type: "time"
    });
    const newInputBox = createElement("input", {
        class: "col-md-4 entry-input-box",
        placeholder: "New Entry"
    });

    if (entry) {
        if (entry.start) newTimeStart.value = entry.start;
        if (entry.end) newTimeEnd.value = entry.end;
        if (entry.text) newInputBox.value = entry.text;
        if (typeof entry === "string") newInputBox.value = entry;
    }

    newInputBox.addEventListener("keypress", (event) => { // submit if enter is pressed
        if (event.key === "Enter") {
            event.preventDefault();
            saveEntries();
        }
    });

    const newDeleteBut = createElement("button", { class: "col-md-1 btn btn-danger entry-remove-but" });
    newDeleteBut.onclick = () => {
        newEntryBox.remove();
        if (document.getElementById("entry-form").childElementCount === 0) { // remove labels if no entries exist
            document.getElementById("entry-labels").style.visibility = "hidden";
        }
    };
    newDeleteBut.innerText = "Remove";

    newEntryBox.append(newTimeStart, newTimeEnd, newInputBox, newDeleteBut);
    document.getElementById("entry-form").append(newEntryBox);
    document.getElementById("entry-labels").style.visibility = "visible";
}

function hideCellEntries () {
    // Note, does not save any unsaved info, done on purpose
    document.getElementById("entry-form").innerHTML = "";
    document.getElementById("entry-info").innerText = "";
    document.getElementById("entry-warning").hidden = true;
    document.getElementById("entry-add-but")?.remove();
    document.getElementById("entry-submit-but")?.remove();
    document.getElementById("entries").hidden = true;
}

// saves entry updates either on button press of key enter
function saveEntries () {
    if (!selectedDate) return;

    const data = getEntries();
    if (data) data.sort(compareEntries);

    // uses ajax to post the new entries to the server
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "update", true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8"); // sending json

    xhr.send(JSON.stringify({ name: calendar.name, code: calendar.code, date: selectedDate, data }));
    xhr.onload = function () {
        if (xhr.status === 201) { // if the post was successful, update cell in calendar
            calendar.entries[selectedDate] = data;
            updateCell(selectedDate, data);
            setEntryWarning("Entries Saved!");
        } else {
            setEntryWarning("Server Error: " + JSON.parse(xhr.responseText).error, "red");
        }
    };

    // if server is offline / creates an error
    xhr.onerror = function () {
        if (xhr.status === 0) {
            showCellEntries();
            setEntryWarning("Server connection refused, try again later", "red");
        } else {
            setEntryWarning("An Error Occurred : Code " + xhr.status);
        }
    };
}

// returns a list of non empty entries
function getEntries () {
    const entryForm = document.getElementById("entry-form");
    const boxes = entryForm.querySelectorAll(".entry-box");

    const data = [];
    boxes.forEach((box) => {
        const entry = { text: box.querySelector(".entry-input-box").value };
        if (!entry.text) return; // if not text is present

        if (box.querySelector(".start").value) {
            entry.start = box.querySelector(".start").value;
        } if (box.querySelector(".end").value) {
            entry.end = box.querySelector(".end").value;
        }
        data.push(entry);
    });

    return data;
}

// if a time isn't set, assume start=00:00, end=24:00
function compareEntries (e1, e2) {
    const start1 = e1.start || "00:00";
    const start2 = e2.start || "00:00";
    const end1 = e1.end || "24:00";
    const end2 = e2.end || "24:00";

    if (start1 === start2) { // prioritise start over end
        if (end1 === end2) return 0;
        else return compareTimes(end1, end2);
    } else return compareTimes(start1, start2);
}

// only compares the strings hh:mm with hh:mm
function compareTimes (t1, t2) {
    if (t1 === t2) return 0;

    const [sh1, sm1] = t1.split(":");
    const [h1, m1] = [parseInt(sh1), parseInt(sm1)];
    const [sh2, sm2] = t2.split(":");
    const [h2, m2] = [parseInt(sh2), parseInt(sm2)];

    if (h1 === h2) {
        if (m1 === m2) return 0;
        else if (m1 < m2) return -1;
        else return 1;
    } else if (h1 < h2) return -1;
    else return 1;
}

// updates a specific cell in the calendar
function updateCell (date, data) {
    const cell = document.querySelector(`[data-date="${date}"]`);
    if (cell) {
        cell.querySelector(".cell-inner")?.remove();
        if (data.length > 0) {
            cell.append(createCellInner(data));
        }
    }
}

// getters and setters for localStorage
function getStorage (key) {
    return localStorage.getItem(key);
}

function setStorage (key, value) {
    return localStorage.setItem(key, value);
}

// entry point application
init();
