const express = require('express');
const app = express();
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 4000;
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require("./database/dbConfig");

app.use(express.json());


//import routes
const authRoutes = require('./routes/auth')
const attendRoutes = require('./routes/attend')
const employeeRoutes = require('./routes/employee')

//Routes
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/attend", attendRoutes)
app.use("/api/v1/employees", employeeRoutes)


app.get("/", (req, res) => {
    res.json({message: 'Welcome to NBS API'});
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

