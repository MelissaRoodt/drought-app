import express from "express";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";

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

router.get("/register", (req, res) => {
    res.render("register.ejs");
});

// Local Registering
router.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const re_password = req.body.passwordRepeated;
    const name = req.body.name;
    const phone_number = req.body.phone_number;
    const address = req.body.address;

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
                        const result = await db.query("INSERT INTO users (email, password, name, phone_number, address, temp_secret) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
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

// Biometrics registering
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
 
router.post("/register-biometrics", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send("Username is required");
 
    const userId = username;
    const challenge = await fido.attestationOptions();
    registeredUsers[userId] = { challenge };
 
    
    res.json(challenge);
});
 
router.post("/register-biometrics/complete", async (req, res) => {
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

export default(router);