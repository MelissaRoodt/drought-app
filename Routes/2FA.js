import express from "express";
import speakeasy from "speakeasy";
import env from "dotenv";
import pg from "pg";
import { currentUser } from "./Login.js";

const router = express.Router();
env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

//2fa end point: Verify initial 2fa !happens once!
router.get("/2fa/verify", (req, res) => {
    res.render("2faVerify.ejs");
});

//2fa end point: Verify 2fa 
router.get("/2fa/validate", (req, res) => {
    res.render("2fa.ejs");
});

//check if user should go through 2fa
router.get("/checkLoginStatus", async (req, res) => {
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
router.post("/enable2fa", async (req, res) => {
    const tfa_enabled = req.body.tfa_enabled ? true : false;
    try {
        // Update the user record to permanently store the verified secret
        await db.query("UPDATE users SET tfa_enabled = $1 WHERE user_id = $2", [tfa_enabled, currentUser]);
        //check value to send email
        
        res.redirect("/account?message=2FA%20prefrences%20updated%20successfully");
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

//verify if the token works !This only happens once!
router.post("/2fa/verify", async (req, res) => {
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
router.post("/2fa/validate", async (req, res) => {
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

export default(router);