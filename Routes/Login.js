import express from "express";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import { Fido2Lib } from "fido2-lib";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import passport from "passport";

const router = express.Router();
env.config();
const saltRounds = 10;

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

let currentUser = 0;

router.use(passport.initialize());
router.use(passport.session());

router.get("/login", (req, res) => {
    res.render("login.ejs");
});

// Local login
router.post("/login",
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

// Google Login
router.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

router.get("/auth/google/main",
    passport.authenticate("google", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
);

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

// Biometric login
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

router.post("/login-biometrics", async (req, res) => {
    const { username } = req.body;
    const userId = username;
    if (!registeredUsers[userId]) return res.status(400).send("User not found");
    
    const challenge = await fido.assertionOptions();
    registeredUsers[userId].challenge = challenge;
    
    res.json(challenge);
});

router.post("/login-biometrics/complete", async (req, res) => {
    const { username, assertion } = req.body;
    const userId = username;
    if (!registeredUsers[userId]) return res.status(400).send("User not found");
    
    try {
        const result = await fido.assertionResult(assertion, {
            challenge: registeredUsers[userId].challenge,
            credId: registeredUsers[userId].id,
            publicKey: registeredUsers[userId].publicKey
        });
        
        
        req.login(userId, (err) => {
            if (err) {
                return res.status(500).send("Error logging in");
            }
            res.send("Biometric login successful!");
        });
    } catch (err) {
        console.error("Error during biometric login:", err);
        res.status(500).send("Biometric login failed");
    }
});

passport.serializeUser((user, done) => {
    done(null, user.user_id); // Make sure you're saving the user ID correctly
});

passport.deserializeUser(async (currentUser, done) => {
    try {
        const user = await db.query("SELECT * FROM users WHERE user_id = $1", [currentUser]);
        done(null, user.rows[0]); // This must return a user object
    } catch (err) {
        done(err, null);
    }
});

export {currentUser};

export default(router);