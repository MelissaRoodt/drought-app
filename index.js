import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", (req, res) => {
    res.render("home.ejs");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/**Todo
 * Fix the login -> Form
 * Verify data agianst some db
 * If succesfull move to home.ejs
 * 
 * Secondary
 * Refactor partials 
 * Add partials to home.ejs
 */