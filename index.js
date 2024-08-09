import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;//use this amount in register
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

app.get("/", (req, res) => {
    res.render("login.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    const email = req.body.username;
    const loginPassword = req.body.password;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;
            bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                } else {
                    if (result) {
                        res.render("home.ejs");
                    } else {
                        res.send("Incorrect Password");
                    }
                }
            });
        } else {
            res.send("User not found");
        }
    } catch (err) {
        console.log(err);
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/**Todo
 * Implement password reset
 * Add encrypted file
 * 
 * Secondary
 * Refactor partials 
 * Add partials to home.ejs
 */