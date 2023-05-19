const express = require('express')
const app = express()
const passport = require("passport");
const session = require('express-session');
const store = session.MemoryStore();
const initializePassport = require("../config/passportConfig");


initializePassport(passport);

app.use(passport.initialize());
app.use(passport.session());

const revokedTokens = new Set(); // In-memory token blacklist

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


module.exports = {verifyToken}