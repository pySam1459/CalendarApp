const { readFile } = require("fs");
const express = require("express");
const api = require("./api");

const app = express();

app.use(express.json());
app.use("/public", express.static("./public/"));

// server index.html
app.get("/", (_, res) => {
    readFile("./public/index.html", "utf-8", (err, file) => {
        if (err) console.log("ERROR at GET / : " + err);
        else res.send(file);
    });
});

// Calendar
// list the UUIDs of all calendars
app.get("/all", api.getAll);

// list the UUIDs of all calendars created after :date
app.get("/all/:date", api.getAllDate);

// searches for a calendar with query name and code
app.get("/calendar", api.getCalendar);

// gets a calendar with unique id
app.get("/calendar/:uid", api.getCalendarUID);

// creates a new calendar
app.post("/new", api.postNew);

// deletes a calendar
app.delete("/delete", api.deleteDelete);

// Entry
// method to list the entries for a date, allow start/end bounds
app.get("/entries", api.getEntries);

// method to list the attrib of the entries for a date, allow start/end bounds
app.get("/entries/:attr", api.getEntriesAttrib);

// method to get details of a entry at index
app.get("/entry", api.getEntry);

// updates a date with entries
app.post("/update", api.postUpdate);

// deletes all of the entries at a date
app.delete("/entries", api.deleteEntries);

function loadDB (filedata, filemap) {
    api.loadDB(filedata, filemap);
}

module.exports = { app, loadDB };
