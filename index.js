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

//Logout 
app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

// Basic login route
app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
);

passport.use(new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashPassword = user.password;
            let currentUser = user.user_id; // Declare currentUser here

            bcrypt.compare(password, storedHashPassword, (err, result) => {
                if (err) {
                    return cb(err);
                } else if (result) {
                    return cb(null, user);
                } else {
                    return cb(null, false); // Password failed
                }
            });
        } else {
            return cb("user not found");
        }
    } catch (err) {
        return cb(err);
    }
}));

//Session Management -> save user to local session
passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/**The System:
 * Basic Authentication (password + email + salt rounds + hashing)
 * Google Login (OAuth+Passport)
 * Password Reset
 * Secure Practices in Code (Enviroment variables)
 * Sessions
 * 
 * Upcoming Features:
 * 2FA authentication
 * Biometric Authentication
 */