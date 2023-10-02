const express = require('express');
const cors = require("cors");
const {videoRouter} = require("./routes/video.router");
const {mongoConnect} = require("./services/mongo");
const {syncVideoFilesWithDatabase} = require("./controllers/video.controller");
const app = express();
const PORT = process.env.PORT || 8000;


// Enable CORS
app.use(cors());
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));


//Routes
app.use('/api/video', videoRouter);

async function startServer(){
  await mongoConnect();
  await syncVideoFilesWithDatabase();
  app.listen(PORT, ()=>{
    console.log(`App started on ${PORT}`);
  });
}

startServer().then(r => console.log(r));
