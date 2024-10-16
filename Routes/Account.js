import express from "express";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import { currentUser } from "../Routes/Login.js";
//import { currentUser } from "./Register.js";

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

router.get("/account", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT email, name, phone_number, address FROM users WHERE user_id = $1", [currentUser]);

            if (result.rows.length === 0) {
                return res.status(404).send("User not found.");
            }

            const { email, name, phone_number, address } = result.rows[0];

            res.render("account.ejs", {
                user: {
                    email: email || "",
                    name: name || "",
                    phone_number: phone_number || "",
                    address: address || ""
                }
            });
        } catch (err) {
            console.error("Error fetching user details:", err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

// Password update
router.post("/update-password", async (req, res) => {
    if (req.isAuthenticated()) {
        const { "current-password": currentPassword, "new-password": newPassword, "confirm-password": confirmPassword } = req.body;

        try {
            const userResult = await db.query("SELECT * FROM users WHERE user_id = $1", [currentUser]);

            if (userResult.rows.length === 0) {
                return res.status(404).send("User not found.");
            }

            const user = userResult.rows[0];
            
            if (user.provider !== 'email') {
                return res.redirect("/account?message=Password%20cannot%20be%20updated%20for%20Google%20accounts");
            }

            const storedHashPassword = user.password;

            const passwordMatch = await bcrypt.compare(currentPassword, storedHashPassword);
            if (!passwordMatch) {
                return res.status(400).send("Current password is incorrect.");
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).send("New passwords do not match.");
            }

            const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

            await db.query("UPDATE users SET password = $1 WHERE user_id = $2", [newHashedPassword, currentUser]);

            res.redirect("/account?message=Password%20updated%20successfully");
        } catch (err) {
            console.error("Error updating password:", err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

router.post("/update-email", async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
        return res.status(400).send("Invalid email address.");
    }

    try {
        const result = await db.query("UPDATE users SET email = $1 WHERE user_id = $2", [email, currentUser]);

        if (result.rowCount === 0) {
            return res.status(404).send("User not found.");
        }

        res.redirect("/account?message=Email%20updated%20successfully");
    } catch (err) {
        console.error("Error updating email:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Modify Personal Information
router.post("/update-info", async (req, res) => {
    if (req.isAuthenticated()) {
        const { name, phone_number, address } = req.body;
        
        try {
            await db.query(
                "UPDATE users SET name = $1, phone_number = $2, address = $3 WHERE user_id = $4",
                [name, phone_number, address, currentUser]
            );
            
            res.redirect("/account?message=Information%20updated%20successfully");
        } catch (err) {
            console.error("Error updating personal information:", err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

// Delete account
router.get("/delete", async (req, res) => {
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

export default(router);