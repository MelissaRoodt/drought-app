import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import env from "dotenv";
import pg from "pg";
import session from "express-session";//create user session (cookies)
import passport from "passport";//used to authenticate
import { Strategy } from "passport-local";//authenticate strategy (local)
import GoogleStrategy from "passport-google-oauth2";//authenticate strategy (google)
import speakeasy from "speakeasy";

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

//2fa end point: Verify initial 2fa !happens once!
app.get("/2fa/verify", (req, res) => {
    res.render("2faVerify.ejs");
});

//2fa end point: Verify 2fa 
app.get("/2fa/validate", (req, res) => {
    res.render("2fa.ejs");
});

//check if user should go through 2fa
app.get("/checkLoginStatus", async (req, res) => {
    try {
        const user_id = currentUser; 
        // Query to get tfa_enabled
        const tfa_enabled_result = await db.query("SELECT tfa_enabled FROM users WHERE user_id = $1", [user_id]);
        const tfa_enabled = tfa_enabled_result.rows[0]?.tfa_enabled;

        // Query to get has_verified_2fa
        const has_verified_result = await db.query("SELECT has_verified_2fa FROM users WHERE user_id = $1", [user_id]);
        const has_verified = has_verified_result.rows[0]?.has_verified_2fa;

        // Redirect logic based on tfa_enabled and has_verified
        if (tfa_enabled === true && has_verified === false) {
            return res.redirect("/2fa/verify");
        } else if (tfa_enabled === true && has_verified === true) {
            return res.redirect("/2fa/validate");
        } else {
            return res.redirect("/");
        }
    } catch (error) {
        res.status(500).json({ message: `Internal Server Error: ${error.message}` });
    }
});

//Local login Route
app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/checkLoginStatus",
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
        successRedirect: "/checkLoginStatus",
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

    if (password === re_password) {
        try {
            const checkResults = await db.query("SELECT * FROM users WHERE email = $1",
                [email]
            );
            if (checkResults.rows.length > 0) {
                res.render("login.ejs", { error: "Email already exist try logging in" });
            } else {
                //password hashing
                bcrypt.hash(password, saltRounds, async (err, hash) => {
                    if (err) {
                        console.log(err);
                    } else {
                        //generate the temp 2fa code
                        const temp_secret = speakeasy.generateSecret();
                        const result = await db.query("INSERT INTO users (email, password, temp_secret) VALUES ($1, $2, $3) RETURNING *",
                            [email, hash, temp_secret.base32]
                        );
                        const user = result.rows[0];
                        req.login(user, (err) => {
                            if (err) {
                                console.log(err);
                            }
                            currentUser = user.user_id;
                            console.log(currentUser);
                            //res.json({ id: currentUser, secret: temp_secret.base32 });  // Send secret
                            res.redirect("/");
                        });
                    }
                });
            }
        } catch (err) {
            console.error('Error registering user:', err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.render("register.ejs", { error: "Passwords are not identical." });
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
                    return cb(null, user);// successfull
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
                    //generate the temp 2fa code
                    const temp_secret = speakeasy.generateSecret();
                    //create a new user
                    const newUser = await db.query(
                        "INSERT INTO users (email, password, temp_secret) VALUES ($1, $2, $3)",
                        [profile.email, "google", temp_secret.base32]
                    );

                    // Save the ID of the newly added user
                    const checkResults = await db.query("SELECT * FROM users WHERE email = $1", [
                        profile.email,
                    ]);
                    if (checkResults.rows.length > 0) {
                        currentUser = checkResults.rows[0].user_id;
                        console.log(currentUser);
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

/**=================================================
 * 2FA: 
 * Obtain the temp_secret when login
 * Verify temp_secret using Authenticator app, store the temp_secret permanently !happens once!
 * Validate user using Authenticator app 
 * Go to dashboard
 * 
 * Todo:
 * Check if 2fa enabled
 * ----First Time
 * Perform verification process to store data perm
 * ----N Times
 * Yes: Take user to 2fa after login
 * No: Take user to dashboard
 ===================================================*/

//handle post to enable/disable 2fa
app.post("/enable2fa", async (req, res) => {
    const tfa_enabled = req.body.tfa_enabled ? true : false;
    try {
        // Update the user record to permanently store the verified secret
        await db.query("UPDATE users SET tfa_enabled = $1 WHERE user_id = $2", [tfa_enabled, currentUser]);
        res.redirect("/account?message=Password%20updated%20successfully");
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

//verify if the token works !This only happens once!
app.post("/2fa/verify", async (req, res) => {
    const token = req.body.token;

    try {
        const result = await db.query("SELECT temp_secret FROM users WHERE user_id = $1", [currentUser]);

        if (result.rows.length > 0) {
            const secret = result.rows[0].temp_secret;

            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: "base32",
                token: token,
            });

            if (verified) {
                // Update the user record to permanently store the verified secret
                await db.query("UPDATE users SET secret = $1, temp_secret = NULL, has_verified_2fa = $2 WHERE user_id = $3", [secret, true, currentUser]);

                // Redirect the user if the verification is successful
                return res.redirect("/checkLoginStatus"); // use return to prevent further execution
            } else {
                return res.json({ verified: false }); // also use return here
            }
        } else {
            return res.status(404).json({ message: "User not found" }); // use return here as well
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        return res.status(500).json({ message: "Internal Server Error" }); // use return here
    }
});

//When user logs in, provide a token from their authenticator app, to validate
app.post("/2fa/validate", async (req, res) => {
    const token = req.body.token;

    try {
        const result = await db.query("SELECT secret FROM users WHERE user_id = $1", [currentUser]);

        if (result.rows.length > 0) {
            const secret = result.rows[0].secret;

            const tokenValidates = speakeasy.totp.verify({
                secret: secret,
                encoding: "base32",
                token: token
            });

            if (tokenValidates) {
                res.redirect("/");
            } else {
                res.json({ validated: false });
            }
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error validating token:", error);
        res.status(500).json({ message: "Internal Server Error" });
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
 * Account 
 ===================================================*/
app.get("/account", (req, res) => {
    res.render("account.ejs");
});

app.get("/delete", async (req, res) => {
    if (req.isAuthenticated()) {
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

    } else {
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