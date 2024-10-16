import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import pg from "pg";
import session from "express-session";//create user session (cookies)
import passport from "passport";//used to authenticate
import { currentUser } from "./Routes/Login.js";

const app = express();
const port = 3000;
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

app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("home.ejs");
    } else {
        res.redirect("/login");
    }
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

//Session Management -> save user to local session
passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

/**=================================================
 * Login route
===================================================*/

import loginRoute from "./Routes/Login.js";

app.use("/", loginRoute);

/**=================================================
 * Register route
===================================================*/

import registerRoute from "./Routes/Register.js";

app.use("/", registerRoute);

/**=================================================
 * Account route
===================================================*/

import accountRoute from "./Routes/Account.js";

app.use("/", accountRoute);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

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