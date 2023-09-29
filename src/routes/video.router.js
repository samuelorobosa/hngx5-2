const express = require('express');
const {
    handleVideoUpload: handleVideoUploadController,
    handleVideoEdit: handleVideoEditController,
    handleFetchVideo: handleFetchVideoController,
    handleFetchVideos: handleFetchVideosController,
    handleDeleteVideo: handleDeleteVideoController
} = require("../controllers/video.controller");
const uploadFile = require("../middlewares/fileUpload");

exports.videoRouter = videoRouter = express.Router();


//Routes definition
videoRouter.post('/upload', uploadFile, handleVideoUploadController);
videoRouter.post('/edit/:id', handleVideoEditController);
videoRouter.get('/:id', handleFetchVideoController);
videoRouter.get('/', handleFetchVideosController);
videoRouter.get('/delete/:id', handleDeleteVideoController);