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
let userEmail = "";

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

//Local login Route
app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
);

//Google Login Route
app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

app.get("/auth/google/main",
    passport.authenticate("google", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
);

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

    if(password === re_password){
        try{
            const checkResults = await db.query("SELECT * FROM users WHERE email = $1", 
                [email]
            );
            if(checkResults.rows.length > 0){
                res.render("login.ejs", {error: "Email already exist try logging in"});
            }else{
                //password hashing
                bcrypt.hash(password, saltRounds, async (err, hash) => {
                    if(err) {
                        console.log(err);
                    }else{
                        const result = await db.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", 
                            [email, hash] 
                         );
                         const user = result.rows[0];
                         req.login(user, (err) => {
                            if(err) {
                                console.log(err);
                            }
                            currentUser = user.user_id;
                            res.redirect("/");
                         });
                    }
                });  
            }
        }catch (err) {
            console.error('Error registering user:', err);
            res.status(500).send("Internal Server Error");
        }
    }else{
        res.render("register.ejs", {error: "Passwords are not identical."});
    }
});

// Local login Strategy
passport.use(new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashPassword = user.password;
            currentUser = user.user_id; // Declare currentUser here

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

// Google Login Strategy
passport.use("google",
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/main",
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        async (accessToken, refreshToken, profile, cb) => {
            try {
                const result = await db.query("SELECT * FROM users WHERE email = $1", [
                    profile.email,
                ]);
                if (result.rows.length === 0) {
                    const newUser = await db.query(
                        "INSERT INTO users (email, password) VALUES ($1, $2)",
                        [profile.email, "google"]
                    );

                    // Save the ID of the newly added user
                    const checkResults = await db.query("SELECT * FROM users WHERE email = $1", [
                        profile.email,
                    ]);
                    if (checkResults.rows.length > 0) {
                        currentUser = checkResults.rows[0].user_id;
                    }

                    return cb(null, newUser.rows[0]);
                } else {
                    currentUser = result.rows[0].user_id;
                    return cb(null, result.rows[0]);
                }
            } catch (err) {
                return cb(err);
            }
        }
    )
);

//Session Management -> save user to local session
passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

/**=================================================
 * Account 
 ===================================================*/
app.get("/account", (req, res) => {
    res.render("account.ejs");
});

app.get("/delete", async (req, res) => {
    if(req.isAuthenticated()){
        try {
            const resultReview = await db.query("DELETE FROM users WHERE user_id = " + currentUser);

            if (resultReview.rowCount === 0) {
                console.log(`No user deleted with id ${req.params.id}`);
                res.status(404).send('User not found');
                return;
            }
            res.redirect("/Logout");
        } catch (err) {
            console.error('Error deleting user:', err);
            res.status(500).send('Internal Server Error');
        }

    }else{
        res.redirect("/login");
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

/**The System:
 * Basic Authentication (password + email + salt rounds + hashing)
 * Google Login (OAuth+Passport)
 * Secure Practices in Code (Enviroment variables)
 * Sessions
 * 
 * Upcoming Features:
 * Password Reset
 * 2FA authentication
 * Biometric Authentication
 */