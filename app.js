const express = require("express");
const expressLayout = require("express-ejs-layouts");
const app = express();
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const PORT = 5500;
const authRoutes = require("./routes/authRoutes");

connectDB();

app.use(express.static(__dirname + "/public"));

//Templating engine
app.use(expressLayout);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/", require("./routes/main"));
app.set("layout", "./layouts/index");
app.set("view engine", "ejs");
app.use("/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
