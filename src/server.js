const { app } = require("./app");

// listening on PORT 8080
app.listen(8080, () => {
    console.log("Calendar available on http://localhost:8080");
    console.log("An Example Calendar: name='Test Calendar' code='1234'");
});
