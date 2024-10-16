import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import env from "dotenv";
import pg from "pg";
import session from "express-session";//create user session (cookies)
import passport from "passport";//used to authenticate
import { Strategy } from "passport-local";//authenticate strategy (local)
import GoogleStrategy from "passport-google-oauth2";//authenticate strategy (google)

const app = express();
const port = 3000;
const saltRounds = 10;//use this amount in register
env.config();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

let currentUser = 0;

app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("home.ejs");
    } else {
        res.redirect("/login");
    }
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

//Logout 
app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

// Local register Strategy
app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const re_password = req.body.passwordRepeated;
    const name = req.body.name;
    const phone_number = req.body.phone_number;
    const address = req.body.address;

    if (password === re_password) {
        try {
            const checkResults = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            if (checkResults.rows.length > 0) {
                res.render("login.ejs", { error: "Email already exists, try logging in" });
            } else {
                bcrypt.hash(password, saltRounds, async (err, hash) => {
                    if (err) {
                        console.log(err);
                    } else {
                        const result = await db.query(
                            "INSERT INTO users (email, password, name, phone_number, address) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                            [email, hash, name, phone_number, address]
                        );
                        const user = result.rows[0];
                        req.login(user, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            currentUser = user.user_id;
                            res.redirect("/");
                        });
                    }
                });
            }
        } catch (err) {
            console.error("Error registering user:", err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.render("register.ejs", { error: "Passwords are not identical." });
    }
});


//Session Management -> save user to local session
passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

/**=================================================
 * Biometric stuff
===================================================*/

import loginRoute from "./Routes/Login.js";

app.use("/", loginRoute);

import { Fido2Lib } from "fido2-lib";

const fido = new Fido2Lib({
    timeout: 60000,
    rpId: "localhost",
    rpName: "MyApp",
    rpIcon: "https://example.com/logo.png",
    challengeSize: 32,
    attestation: "direct",
    cryptoParams: [-7, -257],
});

let registeredUsers = {};
 
app.post("/register-biometrics", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send("Username is required");
 
    const userId = username;
    const challenge = await fido.attestationOptions();
    registeredUsers[userId] = { challenge };
 
    
    res.json(challenge);
});
 
app.post("/register-biometrics/complete", async (req, res) => {
    const { username, attestation } = req.body;
    const userId = username;
    if (!registeredUsers[userId]) return res.status(400).send("User not found");
 
    try {
        const result = await fido.attestationResult(attestation, registeredUsers[userId]);
 
        registeredUsers[userId].id = result.authnrData.get("credId");
        registeredUsers[userId].publicKey = result.authnrData.get("credentialPublicKey");
 
        res.send("Biometric registration complete!");
    } catch (err) {
        console.error("Error during biometric registration:", err);
        res.status(500).send("Error registering biometrics");
    }
});

/**=================================================
 * Account 
===================================================*/

import accountRoute from "./Routes/Account.js";

app.use("/", accountRoute);




app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export {currentUser};

/**The System:
 * Basic Authentication (password + email + salt rounds + hashing)
 * Google Login (OAuth+Passport)
 * Secure Practices in Code (Enviroment variables)
 * Sessions
 * Biometric Authentication
 * Password reset
 * 
 * Upcoming Features:
 * 2FA authentication
 */