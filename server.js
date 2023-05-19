const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

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
    res.send("Welcome to NBS API");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

