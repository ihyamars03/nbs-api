const express = require('express');
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const store = session.MemoryStore();
const pgSession = require('connect-pg-simple')(session);

// middleware
app.use(express.json());
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
        store: new pgSession({
            pool,
            tableName: 'sessions',
        }),
    })
);
app.use(passport.initialize());
app.use(passport.session());


const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 4000;

const revokedTokens = new Set(); // In-memory token blacklist

const revokeToken = (token, req) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            throw err;
        }
    });
};

const isTokenRevoked = (token) => {
    return revokedTokens.has(token); // Check if the token is in the blacklist
};

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const refreshToken = req.headers['refresh-token'];

    if (!token && !refreshToken) {
        return res.status(401).send({ message: 'No token provided' });
    }

    if (isTokenRevoked(token)) {
        return res.status(401).send({ message: 'Unauthorized' });
    }

    jwt.verify(token, 'secret', (err, decoded) => {
        if (err && err.name === 'TokenExpiredError' && refreshToken) {
            jwt.verify(refreshToken, 'secret', (refreshErr, refreshDecoded) => {
                if (refreshErr) {
                    return res.status(403).send({ message: 'Failed to authenticate refresh token' });
                }
                req.userId = refreshDecoded.id;
                next();
            });
        } else if (err) {
            return res.status(403).send({ message: 'Failed to authenticate token' });
        } else {
            req.userId = decoded.id;
            next();
        }
    });
};

const generateRefreshToken = (req, res, next) => {
    req.refreshToken = uuidv4();
    next();
};




// routes
app.post("/api/auth/login", passport.authenticate('local'), (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user.uuid }, 'secret', { expiresIn: '2h' });
    const refreshToken = req.refreshToken;
    res.status(200).send({ message: 'Berhasil Login', token, refreshToken });
});

app.post("/api/auth/refresh-token", (req, res) => {
    const { refreshToken } = req.body;

    // Validate the refresh token against your stored tokens in the database or secure storage
    // Here, we're just checking if the received token matches the previously generated refresh token
    if (refreshToken !== req.refreshToken) {
        return res.status(403).send({ message: 'Invalid refresh token' });
    }

    // Generate a new access token
    const accessToken = jwt.sign({ id: req.user }, 'secret', { expiresIn: '2h' });

    res.status(200).send({ token: accessToken });
});

app.get("/api/user", verifyToken, (req, res) => {
    const userId = req.userId;
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

app.get("/", (req, res) => {
    res.send("Hello");
});

app.post("/api/auth/register", async (req, res) => {
    let {
        name,
        email,
        password,
        password2
    } = req.body;
    console.log({
        name,
        email,
        password,
        password2
    });

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
        console.log(hashedPassword)

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    throw err
                }
                console.log(results.rows);

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
                            console.log(results.rows);
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

app.post("/api/auth/logout", (req, res) => {
    if (!req.user) {
        res.status(401).send({ message: 'Unauthorized' });
        return;
    }
    req.logOut(() => {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).send({ message: 'No token provided' });
        }

        // Revoke the access token by adding it to the blacklist
        revokedTokens.add(token);

        res.status(200).send({ message: 'Successfully logged out' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.post("/api/auth/check-email", (req, res) => {
    const { email } = req.body;

    pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email],
        (err, results) => {
            if (err) {
                throw err;
            }

            console.log(results.rows);

            if (results.rows.length > 0) {
                res.status(200).send({ message: "Email exists in database" });
            } else {
                res.status(404).send({ message: "Email tidak terdaftar silahkan hubungi HRD" });
            }
        }
    );
});
