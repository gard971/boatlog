require("dotenv").config();
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const methodOverride = require("method-override");

const issuesRouter = require("./routes/issues");
const todosRouter = require("./routes/todos");
const attachmentsRouter = require("./routes/attachments");
const serviceRouter = require("./routes/service");
const partsRouter = require("./routes/parts");


const app = express();

app.set("trust proxy", 1)

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.render("index"));

app.use("/service", serviceRouter);
app.use("/issues", issuesRouter);
app.use("/todos", todosRouter);
app.use("/attachments", attachmentsRouter);
app.use("/parts", partsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`BoatLog kjører på http://localhost:${port}`);
});
