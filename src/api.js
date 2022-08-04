const { v4: uuidv4 } = require("uuid");
const { readFileSync, writeFileSync } = require("fs");
const moment = require("moment");

let db = loadJSON("./data/calendarData.json");
let dbmap = loadJSON("./data/calendarMap.json");

function loadJSON (filename) {
    return JSON.parse(readFileSync(filename));
}

function loadDB (filedata, filemap) {
    db = loadJSON(filedata);
    dbmap = loadJSON(filemap);
}

// api functions
// CALENDAR
function getAll (_, res) {
    try {
        res.type("json");
        res.status(200).send({ uids: Object.keys(db) });
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getAllDate (req, res) {
    try {
        if (!validDate(req.params.date, res)) return;

        const date = convertToDateObj(req.params.date);
        const data = Object.keys(db).filter((key) => new Date(db[key].created) > date);
        res.type("json");
        res.status(200).send({ uids: data });
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getCalendar (req, res) {
    try {
        if (validate(req.query.name, req.query.code, res)) {
            res.type("json");
            res.status(200).send(getCal(req.query.name, req.query.code));
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getCalendarUID (req, res) {
    try {
        if (!req.params.uid) {
            sendErr(res, 400, "UUID missing");
        } else if (db[req.params.uid]) {
            res.type("json");
            res.status(200).send(db[req.params.uid]);
        } else {
            sendErr(res, 400, "No calendar exists with UID : " + req.params.uid);
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function postNew (req, res) {
    try {
        if (typeof req.body.name !== "string" || !req.body.name) {
            sendErr(res, 400, "Invalid calendar name");
        } else {
            const uid = uuidv4();
            const code = genCode(req.body.name, req.body.code);
            if (code === -1) {
                sendErr(res, 400, `${req.body.name} #${req.body.code} already exists`);
                return;
            }

            db[uid] = {
                uid,
                name: req.body.name,
                code,
                created: Date.now(),
                entries: {}
            };
            putMap(req.body.name, code, uid);
            commit();
            res.type("json");
            res.status(200).send(db[uid]);
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred " + e);
    }
}

function deleteDelete (req, res) {
    try {
        if (!validate(req.query.name, req.query.code, res)) return;
        const uid = dbmap[req.query.name][req.query.code];
        delete db[uid];

        delete dbmap[req.query.name][req.query.code];
        if (Object.keys(dbmap[req.query.name]).length === 0) {
            delete dbmap[req.query.name];
        }

        commit();
        res.sendStatus(200);
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getEntries (req, res) {
    try {
        const data = getEntriesData(req, res);
        if (data !== null) {
            res.type("json");
            res.status(200).send({ entries: data });
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getEntriesAttrib (req, res) {
    try {
        if (req.params.attr === undefined) {
            sendErr(res, 400, "Entry attribute missing");
        } else if (!["text", "start", "end"].includes(req.params.attr)) {
            sendErr(res, 400, "Invalid attribute");
        } else {
            let data = getEntriesData(req, res);
            if (data !== null) {
                data = data
                    .map(ent => ent[req.params.attr])
                    .filter(attrib => attrib !== undefined);

                res.type("json");
                res.status(200).send({ entries: data });
            }
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function getEntry (req, res) {
    try {
        if (!validate(req.query.name, req.query.code, res)) return;
        else if (!validDate(req.query.date, res)) return;
        else if (req.query.index === undefined) {
            sendErr(res, 400, "Entry Index is missing");
        } else {
            const entries = getCal(req.query.name, req.query.code).entries[req.query.date];
            if (validIndex(req.query.index, entries.length, res)) {
                res.type("json");
                res.status(200).send(entries[parseInt(req.query.index)]);
            }
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function postUpdate (req, res) {
    try {
        if (!validate(req.body.name, req.body.code, res)) return;
        if (!validDate(req.body.date, res)) return;
        if (!validData(req.body.data, res)) return;
        if (req.body.append !== undefined && typeof req.body.append !== "boolean") {
            sendErr(res, 400, "Invalid append");
            return;
        }

        const cal = getCal(req.body.name, req.body.code);
        if (req.body.data.length === 0) {
            delete cal.entries[req.body.date];
        } else if (typeof req.body.append === "boolean" && req.body.append && cal.entries[req.body.date] !== undefined) {
            for (const ent of req.body.data) {
                cal.entries[req.body.date].push(ent);
            }
        } else {
            cal.entries[req.body.date] = req.body.data;
        }
        commit();
        res.sendStatus(201);
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
}

function deleteEntries (req, res) {
    try {
        if (!validate(req.query.name, req.query.code, res)) return;
        if (!validDate(req.query.date, res)) return;

        const date = cleanDate(req.query.date);
        const entries = getCal(req.query.name, req.query.code).entries[date];
        if (entries === undefined) {
            res.sendStatus(200);
            return;
        };

        if (req.query.index !== undefined) {
            if (validIndex(req.query.index, entries.length, res)) {
                if (entries.length === 1) {
                    delete getCal(req.query.name, req.query.code).entries[date];
                } else {
                    entries.splice(parseInt(req.query.index), 1);
                }
                commit();
                res.sendStatus(200);
            }
        } else {
            delete getCal(req.query.name, req.query.code).entries[date];
            commit();
            res.sendStatus(200);
        }
    } catch (e) {
        console.log(e);
        sendErr(res, 400, "An error occurred");
    }
}

module.exports = { getAll, getAllDate, getCalendar, getCalendarUID, postNew, deleteDelete, getEntries, getEntriesAttrib, getEntry, postUpdate, deleteEntries, loadDB };

// HELPER functions
function getCal (name, code) {
    return db[dbmap[name][code]];
}

function sendErr (res, code, msg) {
    res.type("json");
    res.status(code).send({ error: msg });
}

// writes json 'database' to file
function commit () {
    writeFileSync("./data/calendarData.json", JSON.stringify(db, null, 4), "utf8");
    writeFileSync("./data/calendarMap.json", JSON.stringify(dbmap, null, 4), "utf8");
}

function validate (name, code, res) {
    if (name === undefined) {
        sendErr(res, 400, "Calendar name missing");
    } else if (code === undefined) {
        sendErr(res, 400, "Calendar code missing");
    } else if (!(dbmap[name] && dbmap[name][code])) {
        sendErr(res, 400, `${name} #${code} does not exist`);
    } else {
        return true;
    }
    return false;
}

function validDate (date, res) {
    if (date === undefined) {
        sendErr(res, 400, "No date specified");
    } else {
        const [day, month, year] = date.split("-");
        if (moment(`${day}/${month}/${year}`, "DD/MM/YYYY", false).isValid()) {
            return true;
        } else {
            sendErr(res, 400, "Invalid Date");
        }
    }
    return false;
}

function convertToDateObj (date) {
    const [day, month, year] = date.split("-");
    return new Date(`${year}-${month}-${day}`);
}

function validData (data, res) {
    if (data === undefined) {
        sendErr(res, 400, "No Entry Data");
    } else if (!Array.isArray(data)) {
        sendErr(res, 400, "Data must be an array of entry objects");
    } else {
        for (const entry of data) { // gets to here
            if (!validEntry(entry)) {
                sendErr(res, 400, "Data included an Invalid Entry");
                return false;
            }
        }
        return true;
    }
    sendErr(res, 400, "Invalid Data");
    return false;
}

function validEntry (entry) {
    if (entry === undefined) return false;
    if (typeof entry === "string") return true; // backwards compatability
    else if (typeof entry === "object") {
        if (entry.text === undefined) return false; // must have text value
        else {
            if (!validTime(entry.start) || !validTime(entry.end)) return false;
            const cpEntry = { ...entry };
            delete cpEntry.text;
            delete cpEntry.start;
            delete cpEntry.end;
            return Object.keys(cpEntry).length === 0;
        }
    } else return false;
}

function validTime (time) {
    if (time === undefined) return true;
    else if (typeof time !== "string") return false;
    else if (!time.match(/^\d{1,2}:\d\d$/)) return false;
    else {
        const [shh, smm] = time.split(":");
        const [hh, mm] = [parseInt(shh), parseInt(smm)];
        if (hh >= 0 && hh <= 23 && mm >= 0 && mm < 60) return true;
        else if (hh === 24 && mm === 0) return true;
        return false;
    }
}

function validIndex (sidx, length, res) {
    if (sidx === undefined) {
        sendErr(res, 400, "Entry Index is missing");
    } else if (typeof sidx === "number" || typeof sidx === "string") {
        if (typeof sidx === "string" && !sidx.match(/^\d+$/)) {
            sendErr(res, 400, "Invalid Index");
        } else {
            const idx = parseInt(sidx);
            if (idx < 0 || idx >= length) {
                sendErr(res, 400, "Index out of range");
            } else {
                return true;
            }
        }
    }
    return false;
}

function genCode (name, excode) {
    if (typeof excode === "string") {
        if (dbmap[name] === undefined) return excode;
        else if (dbmap[name][excode] === undefined) return excode;
        else return -1;
    }

    const randCode = (lbound, ubound) => Math.floor(Math.random() * ubound + lbound).toString();

    let code = randCode(0, 10000);
    if (dbmap[name]) {
        for (let count = 0; dbmap[name][code]; count++) {
            code = randCode(count * 10000, count * 10000 + 10000);
        }
    }
    return code;
}

function getEntriesData (req, res) {
    try {
        if (!validate(req.query.name, req.query.code, res)) return null;
        else if (!validDate(req.query.date, res)) return null;
        else if (!validTime(req.query.start) || !validTime(req.query.end)) {
            sendErr(res, 400, "Invalid start/end time");
        } else {
            const date = cleanDate(req.query.date);
            const entries = getCal(req.query.name, req.query.code).entries[date];
            if (entries === undefined) {
                return [];
            }

            return entries.filter(ent => inRange(req.query.start, req.query.end, ent));
        }
    } catch (e) {
        sendErr(res, 400, "An error occurred");
    }
    return null;
}

// 1-01-2022, 01-01-2022, 1-1-2022
function cleanDate (undate) {
    const [ud, um, uy] = undate.split("-");
    const [d, m, y] = [parseInt(ud), parseInt(um), parseInt(uy)];
    return `${d}-${m}-${y}`;
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

// bounds are start1, end1
function inRange (start, end, entry) {
    const start1 = start || "00:00";
    const start2 = entry.start || "00:00";
    const end1 = end || "24:00";
    const end2 = entry.end || "24:00";

    return compareTimes(start1, start2) <= 0 && compareTimes(end1, end2) >= 0;
}

function putMap (name, code, uid) {
    if (!dbmap[name]) {
        dbmap[name] = {};
    }
    dbmap[name][code] = uid;
}
