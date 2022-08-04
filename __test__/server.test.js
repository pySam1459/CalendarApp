const request = require("supertest");
const { app, loadDB } = require("../src/app.js");

// first copy test data to temp files, then load temp files as active db
loadDB("./__test__/data/testdata.json", "./__test__/data/testmap.json");

const uuidReg = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;
const timeReg = /^\d{1,2}:\d{2}$/;

// possible entry configuration
const entryPos = [
    expect.objectContaining({ text: expect.any(String) }),
    expect.objectContaining({ text: expect.any(String), start: expect.stringMatching(timeReg) }),
    expect.objectContaining({ text: expect.any(String), end: expect.stringMatching(timeReg) }),
    expect.objectContaining({ text: expect.any(String), start: expect.stringMatching(timeReg), end: expect.stringMatching(timeReg) })
];

// start testing
describe("Calendar Entity Testing", () => {
    describe("GET /calendar", () => {
        test("GET /calendar failure (no query params)", async () => {
            const res = await request(app)
                .get("/calendar")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");
        });
        test("GET /calendar failure (no code params)", async () => {
            const res = await request(app)
                .get("/calendar?name=Test+Calendar")
                .expect(400);
            expect(res.body.error).toBe("Calendar code missing");
        });

        test("GET /calendar success (with query params)", async () => {
            const res = await request(app)
                .get("/calendar?name=Test+Calendar&code=1234")
                .expect(200);
            expect(res.body.name).toBe("Test Calendar");
            expect(res.body.code).toBe("1234");
            expect(res.body.created).toBe(1659396229093);
            expect(res.body.entries).toEqual(expect.objectContaining({
                "19-8-2022": expect.any(Object),
                "18-7-2022": expect.any(Object),
                "28-8-2022": expect.any(Object),
                "26-8-2022": expect.any(Object),
                "22-8-2022": expect.any(Object)
            }));
        });
        test("GET /calendar success (different calendar)", async () => {
            const res = await request(app)
                .get("/calendar?name=Test+Calendar&code=5678")
                .expect(200);
            expect(res.body.name).toBe("Test Calendar");
            expect(res.body.code).toBe("5678");
            expect(res.body.created).toBe(1659397333122);
            expect(res.body.entries["16-7-2022"]).toHaveLength(11);
        });
    });

    describe("GET /calendar/:uid", () => {
        test("GET /calendar/:uid failure (invalid uid 'not-a-valid-uid')", async () => {
            const res = await request(app)
                .get("/calendar/not-a-valid-uid")
                .expect(400);
            expect(res.body.error).toBe("No calendar exists with UID : not-a-valid-uid");
        });

        test("GET /calendar/:uid success (valid uid)", () => {
            return request(app)
                .get("/calendar/9f3acfab-8ad4-4821-93d1-0ead6800df71")
                .expect(200);
        });
        test("GET /calendar/:uid success (another uid)", async () => {
            const res = await request(app)
                .get("/calendar/acca1187-92c3-4154-856b-e1d6248a7227")
                .expect(200);
            expect(res.body.name).toBe("Sam Barnett");
            expect(res.body.code).toBe("1234");
            expect(res.body.entries).toEqual(expect.objectContaining({
                "11-7-2022": expect.arrayContaining([
                    expect.objectContaining({
                        text: "my birthday"
                    })
                ])
            }));
        });
    });

    describe("POST /new", () => {
        test("POST /new failure (no data)", async () => {
            const res = await request(app)
                .post("/new")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Invalid calendar name");
        });
        test("POST /new failure (calendar already exists)", async () => {
            const data = { name: "Test Calendar", code: "1234" };
            const res = await request(app)
                .post("/new")
                .send(data);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Test Calendar #1234 already exists");
        });

        test("POST /new success (with code)", async () => {
            const data = { name: "newcalendar", code: "9876" };
            const res = await request(app)
                .post("/new")
                .send(data);
            expect(res.status).toBe(200);
            expect(res.body.uid).toMatch(uuidReg);
            expect(res.body.name).toBe("newcalendar");
            expect(res.body.code).toBe("9876");
            expect(res.body.created).toEqual(expect.any(Number));
            expect(res.body.entries).toEqual({});
        });
        test("POST /new success (same name, without code)", async () => {
            const data = { name: "Test Calendar" };
            const res = await request(app)
                .post("/new")
                .send(data);
            expect(res.status).toBe(200);
            expect(res.body.name).toBe("Test Calendar");
            expect(res.body.code).not.toBe("1234");
            expect(res.body.code).toMatch(/^\d+$/);
            expect(res.body.entries).toEqual({});
        });
        test("POST /new success (different name, without code)", async () => {
            const data = { name: "newcalendar1" };
            const res = await request(app)
                .post("/new")
                .send(data);
            expect(res.status).toBe(200);
            expect(res.body.name).toBe("newcalendar1");
            expect(res.body.code).toMatch(/^\d+$/);
            expect(res.body.entries).toEqual({});
        });
    });

    describe("DELETE /delete", () => {
        test("DELETE /delete failure (no query params)", async () => {
            const res = await request(app)
                .delete("/delete")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");
        });
        test("DELETE /delete failure (no query params)", async () => {
            const res = await request(app)
                .delete("/delete?name=Delete+Me")
                .expect(400);
            expect(res.body.error).toBe("Calendar code missing");
        });
        test("DELETE /delete success", () => {
            return request(app)
                .delete("/delete?name=Delete+Me&code=0000")
                .expect(200);
        });
    });

    describe("GET /all", () => {
        test("GET /all success", async () => {
            const res = await request(app)
                .get("/all")
                .expect(200);
            expect(res.body.uids).toEqual(expect.arrayContaining([expect.any(String)]));
        });
    });

    describe("GET /all/:date", () => {
        test("GET /all/:date failure (invalid date 'notAdate')", async () => {
            const res = await request(app)
                .get("/all/notAdate")
                .expect(400);
            expect(res.body.error).toBe("Invalid Date");
        });
        test("GET /all/:date failure (invalid date '30-2-2022')", async () => {
            const res = await request(app)
                .get("/all/30-2-2022")
                .expect(400);
            expect(res.body.error).toBe("Invalid Date");
        });
        test("GET /all/:date success (date past '2-2-1970')", async () => {
            const res = await request(app)
                .get("/all/2-2-1970")
                .expect(200);
            expect(res.body.uids).toEqual(expect.arrayContaining([expect.stringMatching(uuidReg)]));
        });
        test("GET /all/:date success (date future '1-1-3000')", async () => {
            const res = await request(app)
                .get("/all/1-1-3000")
                .expect(200);
            expect(res.body.uids).toHaveLength(0);
        });
    });
});

describe("Entry Entity Testing", () => {
    describe("GET /entries", () => {
        test("GET /entries failure (Invalid calendar details)", async () => {
            const res = await request(app)
                .get("/entries")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");

            const res2 = await request(app)
                .get("/entries?name=Test+Calendar")
                .expect(400);
            expect(res2.body.error).toBe("Calendar code missing");
        });
        test("GET /entries failure (Invalid date)", async () => {
            const res = await request(app)
                .get("/entries?name=Test+Calendar&code=1234")
                .expect(400);
            expect(res.body.error).toBe("No date specified");

            const res2 = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=notAdate")
                .expect(400);
            expect(res2.body.error).toBe("Invalid Date");
        });
        test("GET /entries success", async () => {
            const res = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=22-8-2022")
                .expect(200);
            expect(res.body.entries).toEqual(expect.arrayContaining(entryPos));
            expect(res.body.entries).toHaveLength(5);
        });
        test("GET /entries success (date with no entries)", async () => {
            const res = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=1-1-3000")
                .expect(200);
            expect(res.body.entries).toHaveLength(0);
        });
        test("GET /entries failure (Invalid times)", async () => {
            const res = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=22-8-2022&start=aa:bb")
                .expect(400);
            expect(res.body.error).toBe("Invalid start/end time");

            const res2 = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=22-8-2022&end=aa:bb")
                .expect(400);
            expect(res2.body.error).toBe("Invalid start/end time");
        });
        test("GET /entries success (with times)", async () => {
            const res = await request(app)
                .get("/entries?name=Test+Calendar&code=1234&date=22-8-2022&start=10:00&end=20:00")
                .expect(200);
            expect(res.body.entries).toEqual(expect.arrayContaining(entryPos));
            expect(res.body.entries).toHaveLength(1);
        });
    });

    describe("GET /entries/:attr (Using 'text' attr for the majority)", () => {
        test("GET /entries/:attr failure (Invalid calendar details)", async () => {
            const res = await request(app)
                .get("/entries/text")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");

            const res2 = await request(app)
                .get("/entries/text?name=Not+Valid&code=abcd")
                .expect(400);
            expect(res2.body.error).toBe("Not Valid #abcd does not exist");
        });
        test("GET /entries/:attr failure (Invalid Date)", async () => {
            const res = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234")
                .expect(400);
            expect(res.body.error).toBe("No date specified");

            const res2 = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=notAdate")
                .expect(400);
            expect(res2.body.error).toBe("Invalid Date");
        });
        test("GET /entries/:attr failure (Invalid attribute)", async () => {
            const res = await request(app)
                .get("/entries/example?name=Test+Calendar&code=1234&date=22-8-2022")
                .expect(400);
            expect(res.body.error).toBe("Invalid attribute");
        });

        test("GET /entries/:attr success", async () => {
            const res = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=22-8-2022")
                .expect(200);
            expect(res.body.entries).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(res.body.entries).toHaveLength(5);
        });
        test("GET /entries/:attr success (date with no entries)", async () => {
            const res = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=1-1-3000")
                .expect(200);
            expect(res.body.entries).toHaveLength(0);
        });
        test("GET /entries/:attr failure (Invalid times)", async () => {
            const res = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=22-8-2022&start=aa:bb")
                .expect(400);
            expect(res.body.error).toBe("Invalid start/end time");

            const res2 = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=22-8-2022&end=aa:bb")
                .expect(400);
            expect(res2.body.error).toBe("Invalid start/end time");
        });
        test("GET /entries/:attr success (with times)", async () => {
            const res = await request(app)
                .get("/entries/text?name=Test+Calendar&code=1234&date=22-8-2022&start=10:00&end=20:00")
                .expect(200);
            expect(res.body.entries).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(res.body.entries).toHaveLength(1);
        });
        test("GET /entries/:attr success (with attr=start&end)", async () => {
            const res = await request(app)
                .get("/entries/start?name=Test+Calendar&code=1234&date=22-8-2022&start=10:00")
                .expect(200);
            expect(res.body.entries).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(res.body.entries).toHaveLength(2);

            const res2 = await request(app)
                .get("/entries/end?name=Test+Calendar&code=1234&date=22-8-2022&start=10:00")
                .expect(200);
            expect(res2.body.entries).toEqual(expect.arrayContaining([expect.any(String)]));
            expect(res2.body.entries).toHaveLength(1);
        });
    });

    describe("GET /entry", () => {
        test("GET /entry failure (Invalid calendar details)", async () => {
            const res = await request(app)
                .get("/entry")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");

            const res2 = await request(app)
                .get("/entry?name=Test+Calendar")
                .expect(400);
            expect(res2.body.error).toBe("Calendar code missing");
        });
        test("GET /entry failure (Invalid date)", async () => {
            const res = await request(app)
                .get("/entry?name=Test+Calendar&code=1234")
                .expect(400);
            expect(res.body.error).toBe("No date specified");

            const res2 = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=notAdate")
                .expect(400);
            expect(res2.body.error).toBe("Invalid Date");
        });
        test("GET /entry failure (Invalid index)", async () => {
            const res = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=22-8-2022")
                .expect(400);
            expect(res.body.error).toBe("Entry Index is missing");

            const res2 = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=22-8-2022&index=notValid")
                .expect(400);
            expect(res2.body.error).toBe("Invalid Index");

            const res3 = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=22-8-2022&index=1000")
                .expect(400);
            expect(res3.body.error).toBe("Index out of range");
        });
        test("GET /entry success", async () => {
            const res = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=22-8-2022&index=1")
                .expect(200);
            expect(res.body).toEqual({
                text: "test5",
                start: "09:46",
                end: "12:00"
            });

            const res2 = await request(app)
                .get("/entry?name=Test+Calendar&code=1234&date=19-8-2022&index=1")
                .expect(200);
            expect(res2.body).toEqual({
                text: "Get on with the project",
                start: "16:09"
            });
        });
    });

    describe("POST /update", () => {
        test("POST /update failure (Invalid calendar details)", async () => {
            const res = await request(app)
                .post("/update")
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Calendar name missing");

            const data2 = { name: "Test Calendar" };
            const res2 = await request(app)
                .post("/update")
                .send(data2);
            expect(res.status).toBe(400);
            expect(res2.body.error).toBe("Calendar code missing");
        });
        test("POST /update failure (Invalid Date)", async () => {
            const data = { name: "Test Calendar", code: "1234" };
            const res = await request(app)
                .post("/update")
                .send(data);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("No date specified");

            const data2 = { name: "Test Calendar", code: "1234", date: "notAdate" };
            const res2 = await request(app)
                .post("/update")
                .send(data2);
            expect(res.status).toBe(400);
            expect(res2.body.error).toBe("Invalid Date");

            const data3 = { name: "Test Calendar", code: "1234", date: "30-2-2022" };
            const res3 = await request(app)
                .post("/update")
                .send(data3);
            expect(res.status).toBe(400);
            expect(res3.body.error).toBe("Invalid Date");
        });
        test("POST /update failure (Invalid append)", async () => {
            const data = { name: "Test Calendar", code: "1234", date: "23-2-2022", append: "nottrue", data: [] };
            const res = await request(app)
                .post("/update")
                .send(data);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Invalid append");
        });
        test("POST /update failure (Invalid data)", async () => {
            const data1 = { name: "Test Calendar", code: "1234", date: "23-2-2022" };
            const res = await request(app)
                .post("/update")
                .send(data1);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe("No Entry Data");

            const data2 = { ...data1, data: "invalid data" };
            const res2 = await request(app)
                .post("/update")
                .send(data2);
            expect(res2.status).toBe(400);
            expect(res2.body.error).toBe("Data must be an array of entry objects");

            const data3 = { ...data1, data: [{ text: "valid object" }, { random: "object" }] };
            const res3 = await request(app)
                .post("/update")
                .send(data3);
            expect(res3.status).toBe(400);
            expect(res3.body.error).toBe("Data included an Invalid Entry");

            const data4 = { ...data1, data: [{ text: "valid object" }, { text: "maybe valid", start: "notValid" }] };
            const res4 = await request(app)
                .post("/update")
                .send(data4);
            expect(res4.status).toBe(400);
            expect(res4.body.error).toBe("Data included an Invalid Entry");

            const data5 = { ...data1, data: [1, {}, undefined] }; // everything apart from the kitchen sink
            const res5 = await request(app)
                .post("/update")
                .send(data5);
            expect(res5.status).toBe(400);
            expect(res5.body.error).toBe("Data included an Invalid Entry");
        });
        test("POST /update success (no append)", async () => {
            const data = { name: "Test Calendar", code: "1234", date: "23-2-2022", data: [{ text: "new data" }] };
            const res = await request(app)
                .post("/update")
                .send(data);
            expect(res.status).toBe(201);
        });
        test("POST /update success (yes append)", async () => {
            const data = {
                name: "Test Calendar",
                code: "1234",
                date: "23-2-2022",
                append: true,
                data: [{ text: "entry1", start: "10:00" }, { text: "entry2", start: "9:00", end: "10:30" }]
            };
            const res = await request(app)
                .post("/update")
                .send(data);
            expect(res.status).toBe(201);
        });
        test("POST /update success (empty data)", async () => {
            const data = { name: "Test Calendar", code: "1234", date: "23-2-2022", append: true, data: [] };
            const res = await request(app)
                .post("/update")
                .send(data);
            expect(res.status).toBe(201);
        });
    });

    describe("DELETE /entries", () => {
        test("DELETE /entries failure (Invalid calendar details)", async () => {
            const res = await request(app)
                .delete("/entries")
                .expect(400);
            expect(res.body.error).toBe("Calendar name missing");

            const res2 = await request(app)
                .delete("/entries?name=Delete+Me")
                .expect(400);
            expect(res2.body.error).toBe("Calendar code missing");
        });
        test("DELETE /entries failure (Invalid date)", async () => {
            const res = await request(app)
                .delete("/entries?name=Delete+Me&code=0001")
                .expect(400);
            expect(res.body.error).toBe("No date specified");

            const res2 = await request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=notAdate")
                .expect(400);
            expect(res2.body.error).toBe("Invalid Date");
        });
        test("DELETE /entries success (date already has 0 entries)", () => {
            return request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=1-1-3000")
                .expect(200);
        });
        test("DELETE /entries success (no index specified)", () => {
            return request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=13-6-2022")
                .expect(200);
        });
        test("DELETE /entries failure (Invalid Index)", async () => {
            const res = await request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=17-8-2022&index=notValid")
                .expect(400);
            expect(res.body.error).toBe("Invalid Index");

            const res2 = await request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=17-8-2022&index=1000")
                .expect(400);
            expect(res2.body.error).toBe("Index out of range");
        });
        test("DELETE /entries success (with index)", () => {
            return request(app)
                .delete("/entries?name=Delete+Me&code=0001&date=17-8-2022&index=0")
                .expect(200);
        });
    });
});
