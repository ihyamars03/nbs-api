const express = require('express');
const app = express();
const { pool } = require("../database/dbConfig");
const router = express.Router();
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken'); 
const passport = require("passport");
const pgSession = require('connect-pg-simple')(session);

// middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: false, 
    store: new pgSession({
        pool,
        tableName: 'sessions',
    }),
}));

app.use(passport.initialize());
app.use(passport.session());

const initializePassport = require("../config/passportConfig");

initializePassport(passport);

const revokedTokens = new Set(); // In-memory token blacklist

const isTokenRevoked = (token) => {
    return revokedTokens.has(token); // Check if the token is in the blacklist
};

const { verifyToken } = require('../controller/authController');

let currentAccessToken;
let currentRefreshToken;

router.post("/login", (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).send({ message: 'Internal server error' });
        }
        if (!user) {
            return res.status(401).send({ message: info.message });
        }

        req.login(user, { session: false }, (err) => {
            if (err) {
                return res.status(500).send({ message: 'Internal server error' });
            }

            const accessToken = jwt.sign({ id: user.uuid }, 'secret', { expiresIn: '2h' });
            const refreshToken = jwt.sign({ id: user.uuid }, 'refreshSecret', { expiresIn: '7d' });

            currentAccessToken = accessToken;
            currentRefreshToken = refreshToken;

            res.status(200).send({ message: 'Berhasil Login', accessToken, refreshToken });
        });
    })(req, res, next);
});

router.post('/logout', verifyToken, (req, res) => {
    const { token } = req.body;

    if (!token && !currentAccessToken) {
        return res.status(400).send({ message: 'Access token not provided' });
    }

    const tokenToRevoke = token || currentAccessToken; // Use the token from the request body if provided, otherwise use the stored access token

    revokedTokens.add(tokenToRevoke);
    revokedTokens.add(currentRefreshToken); // Also revoke the refresh token

    currentAccessToken = null; // Clear the stored tokens
    currentRefreshToken = null;

    res.status(200).send({ message: 'Tokens revoked successfully' });
});

router.get("/user", verifyToken, (req, res) => {
    const userId = req.userId;

    if (isTokenRevoked(req.headers.authorization) || !currentAccessToken) {
        return res.status(401).send({ message: "Unauthorized - Token has been revoked or user is not logged in" });
    }

    pool.query(
        `SELECT name, email FROM users WHERE uuid = $1`,
        [userId],
        (err, results) => {
            if (err) {
                throw err;
            }
            const user = results.rows[0];
            if (!user) {
                res.status(404).send({ message: "User not found" });
            } else {
                res.status(200).send(user);
            }
        }
    );
});


router.post("/register", async (req, res) => {
    let {
        name,
        email,
        password,
        password2
    } = req.body;

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields" });
    }

    if (password && password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters" });
    }

    if (password != password2) {
        errors.push({ message: "Passwords do not match" })
    }

    if (errors.length > 0) {
        res.status(400).json({ errors });
    } else {
        let hashedPassword = (await bcrypt.hash(password, 10)).toString();
        //console.log(hashedPassword)

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    throw err
                }
                //console.log(results.rows);

                if (results.rows.length > 0) {
                    errors.push({ message: "Email already registered" });
                    res.status(400).json({ errors });
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, password)
                    VALUES ($1, $2, $3)
                    RETURNING uuid, password`, [
                        name,
                        email,
                        hashedPassword
                    ],
                        (err, results) => {
                            if (err) {
                                throw err
                            }
                            res.send({ message: "Successfully registered user" });
                            //console.log(results.rows);
                        }
                    )
                }
            }
        )
    }

    if (!req.body) {
        res.status(400).send({ message: 'No request body provided' });
        return;
    }
});


router.post("/check-email", (req, res) => {
    const { email } = req.body;

    pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email],
        (err, results) => {
            if (err) {
                throw err;
            }

            //console.log(results.rows);

            if (results.rows.length > 0) {
                res.status(200).send({ message: "Email exists in database" });
            } else {
                res.status(404).send({ message: "Email tidak terdaftar silahkan hubungi HRD" });
            }
        }
    );
});

module.exports = router