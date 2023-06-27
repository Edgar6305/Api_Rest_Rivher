const express = require("express");
//const mqtt = require('mqtt');
const sql = require('mssql');
const morgan = require("morgan");
const cors = require("cors");
const colors = require("colors");
const bot = require("./routes/telegram.js")
const middleware = require("./routes/middleware.js")

//instances
const app = express();

//express config
app.use(morgan("tiny"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(cors());

//express routes 
app.use("/api/v1", require("./routes/setup.js"))

//listener
app.listen(3000, () => {
  console.log("API server listening on port 3000");
}); 

bot.sendBot("1228075428", "Hola desde Index")

setInterval(( )=> {
  //middleware.ActivacionRevision(30)
}, 1000*60*60*24);


module.exports = app;