const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

//import routes
const authRoutes = require('./routes/auth')
const attendRoutes = require('./routes/attend')


//Routes
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/attend", attendRoutes)


app.get("/", (req, res) => {
    res.send("Welcome to NBS API");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

