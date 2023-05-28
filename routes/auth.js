const express = require('express');
const app = express();
const { pool } = require("../database/dbConfig");
const router = express.Router();
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const passport = require("passport");
const pgSession = require('connect-pg-simple')(session);
const scheduleReset = require('../controller/resetDate')
const moment = require('moment');
const cron = require('node-cron');

async function getUUID(userId) {
    try {
      const results = await pool.query(
        `SELECT employees.uuid
         FROM users
         LEFT JOIN employees ON users.email = employees.user_email 
         WHERE users.uuid = $1`,
        [userId]
      );
      const uuid = results.rows[0].uuid;
      return uuid;
    } catch (err) {
      throw err;
    }
  }

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

currentAccessToken = null;
currentRefreshToken = null;


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

            
            // Fetch the employee associated with the logged-in user
            pool.query(
                `SELECT * FROM employees WHERE user_email = $1`,
                [user.email],
                (err, results) => {
                    if (err) {
                        throw err;
                    }
                    const employee = results.rows[0];

                    if (!employee) {
                        return res.status(404).send({ message: "Anda tidak terdaftar, silahkan hubungi HRD" });
                    }

                    res.status(200).send({
                        message: 'Berhasil Login',
                        // employee: {
                        //     name: employee.name,
                        //     position: employee.position,
                        //     divisi: employee.divisi,
                        //     wa: employee.wa,
                        //     user_email: employee.user_email,
                        //     status: employee.status,
                        //     photo: employee.photo
                        // },
                        accessToken,
                        refreshToken,
                    });
                }
            );
        });
    })(req, res, next);
});


router.post('/logout', verifyToken, (req, res) => {
    const token = req.get('Authorization');

    if (!token && !currentAccessToken) {
        return res.status(400).send({ message: 'Access token not provided' });
    }

    const tokenToRevoke = token || currentAccessToken; // Use the token from the request body if provided, otherwise use the stored access token

    revokedTokens.add(tokenToRevoke);
    revokedTokens.add(currentRefreshToken); // Also revoke the refresh token

    currentAccessToken = null; // Clear the stored tokens
    currentRefreshToken = null;

    res.status(200).send({ message: 'Anda berhasil logout' }); //token revoked successfully
});

router.get("/user", verifyToken, async (req, res) => {
  const userId = req.userId;
  const uuid = await getUUID(userId)
  const today = moment().toDate('YY-MM-DD');

  await scheduleReset(uuid);

  
  if (isTokenRevoked(req.headers.authorization) || !currentAccessToken) {
    return res.status(401).send({ message: "Anda belum login" });  //unauthorized
  }
  
  pool.query(
    `SELECT users.name AS user_name, users.email, employees.name AS employee_name, employees.position, employees.divisi, employees.wa, employees.status, employees.photo, attendances.clockin_time, attendances.clockout_time
     FROM users
     LEFT JOIN employees ON users.email = employees.user_email 
     LEFT JOIN attendances ON employees.uuid = attendances.uuid
     WHERE users.uuid = $1 AND attendances.date = $2`,
    [userId, today],
    (err, results) => {
      if (err) {
        throw err;
      }
      
      const userFromDB = results.rows[0];

      if (!userFromDB) {
        res.status(404).send({ message: "User tidak ditemukan" });
      } else {
        const user = {
            ...userFromDB,
            date: today
        };
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
        errors.push({ message: "PIN harus 6 karakter" });
    }

    if (password != password2) {
        errors.push({ message: "Kamu salah menginput PIN sebelumnya, silahkan input ulang PIN" })
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
                    errors.push({ message: "Email sudah terdaftar" });
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
                            res.send({ message: "Berhasil mendaftarkan user" });
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

module.exports = {router, currentAccessToken, currentRefreshToken}