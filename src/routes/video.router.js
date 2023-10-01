const express = require('express');
const {
    handleVideoUpload: handleVideoUploadController,
    handleStartChunk: handleStartChunkController,
    handleAssembleVideo: handleAssembleVideoController,
    handleStreamVideo: handleStreamVideoController,
    handleVideoEdit: handleVideoEditController,
    handleFetchVideo: handleFetchVideoController,
    handleFetchVideos: handleFetchVideosController,
    handleDeleteVideo: handleDeleteVideoController
} = require("../controllers/video.controller");
const uploadFile = require("../middlewares/fileUpload");

exports.videoRouter = videoRouter = express.Router();


//Routes definition
// videoRouter.post('/upload', uploadFile, handleVideoUploadController);

videoRouter.get('/start-chunk', handleStartChunkController);
videoRouter.post('/upload-chunk', handleVideoUploadController);
videoRouter.post('/assemble-chunks', handleAssembleVideoController);
videoRouter.get('/stream-video/:id', handleStreamVideoController);

// videoRouter.post('/edit/:id', handleVideoEditController);
// videoRouter.get('/:id', handleFetchVideoController);
// videoRouter.get('/', handleFetchVideosController);
// videoRouter.get('/delete/:id', handleDeleteVideoController);