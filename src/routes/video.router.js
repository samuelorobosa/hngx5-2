const express = require('express');
const {
    handleVideoUpload: handleVideoUploadController,
    handleStartChunk: handleStartChunkController,
    handleAssembleVideo: handleAssembleVideoController,
    handleStreamVideo: handleStreamVideoController,
    handleVideoEdit: handleVideoEditController,
    handleFetchVideos: handleFetchVideosController,
    handleDeleteVideo: handleDeleteVideoController,
    handleTranscribeVideo: handleTranscribeVideoController,
} = require("../controllers/video.controller");
const uploadFile = require("../middlewares/fileUpload");

exports.videoRouter = videoRouter = express.Router();


//Routes definition
// videoRouter.post('/upload', uploadFile, handleVideoUploadController);

videoRouter.get('/start-chunk', handleStartChunkController);
videoRouter.post('/upload-chunk', handleVideoUploadController);
videoRouter.post('/assemble-chunks', handleAssembleVideoController);
videoRouter.get('/stream-video/:id', handleStreamVideoController);
videoRouter.post('/edit/:id', handleVideoEditController);
videoRouter.get('/', handleFetchVideosController);
videoRouter.get('/delete/:id', handleDeleteVideoController);
videoRouter.get('/transcribe/:id', handleTranscribeVideoController);
