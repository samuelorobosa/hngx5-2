const fs = require("fs");
const {parse, join} = require("path");
const {
    handleVideoUpload:handleVideoUploadModel,
    handleVideoEdit: handleVideoEditModel,
    handleFetchVideo: handleFetchVideoModel,
    handleFetchVideos: handleFetchVideosModel,
    handleDeleteVideo: handleDeleteVideoModel,
} = require("../models/video/video.model");
const {setupRabbitMQ} = require("../services/transcription");
const {queueKeys} = require("../utils/queueKeys");
const { v4: uuidv4 } = require('uuid');


exports.handleStartChunk = async function (req, res)  {
    const sessionID = uuidv4(undefined, undefined, undefined);
    const sessionDirectory = join('public', sessionID);

    fs.mkdir(sessionDirectory, (err) => {
        if (err){
            throw err;
        }
        res.status(200).json({
            message: "Chunk initiated successfully",
            sessionId: sessionID
        });
    });
}

exports.handleVideoUpload = async function (req, res)  {
    const chunkNumber = req.headers['chunk-number'];
    const sessionId = req.headers['session-id'];
    const directoryPath = join('public', sessionId, 'chunks');
    const filePath = join(directoryPath, `chunk${chunkNumber}`);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    req.on('data', (chunk) => {
        fs.appendFileSync(filePath, chunk);
    });

    req.on('end', async () => {
     res.status(200).json({
                message: "Chunks uploaded successfully",
      });
    })
}

exports.handleAssembleVideo = async function (req, res)  {
    const {sessionId} = req.body;
    const sessionDir = join('public', sessionId, 'chunks');
    const outputFilePath = join('public', `${sessionId}`, `Untitled-Video.mp4`);
    const writeStream = fs.createWriteStream(outputFilePath);

    for (const file of fs.readdirSync(sessionDir)) {
       const chunk = fs.readFileSync(join(sessionDir, file));
       writeStream.write(chunk);
    }

    writeStream.end();

    writeStream.on('finish', async () => {
        fs.rmdirSync(sessionDir, { recursive: true });
    })
    res.status(200).json({ message: "Video assembled successfully" });
}

exports.handleStreamVideo = async function (req, res)  {
    const {id} = req.params;
    if(!id){
        res.status(400).json({
            message: "Please provide an id",
        });
    }
    const videoPath = join('public', id, 'Untitled-Video.mp4');
    const stat = fs.statSync(videoPath);

    res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size
    });

    const videoStream = fs.createReadStream(videoPath);
    videoStream.pipe(res);
}
// exports.handleVideoUpload = async function (req, res)  {
//     const file = req.file;
//     if (!file) {
//         res.status(400).json({
//             message: "Please upload a file",
//         });
//     }
//
//     const {filename} = file;
//     const __filename = parse(filename).name;
//     const __ext = parse(filename).ext;
//
//     const response = await handleVideoUploadModel({__filename, __ext});
//     if(!response){
//         res.status(500).json({
//             message: "Something went wrong, video not uploaded",
//         });
//     }
//
//     // Create a folder in the public direction named with the id of the video and move the old one
//     fs.mkdir(`public/${response._id.toString()}`, (err) => {
//         if (err){
//             throw err;
//         }
//         fs.rename(`public/${filename}`, `public/${response._id.toString()}/${filename}`, (err) => {
//             if (err){
//                 throw err;
//             }
//             const relative_file_url = `/public/${response._id.toString()}/${filename}`;
//             const file_url = `${req.protocol}://${req.headers.host}${relative_file_url}`;
//
//             // Send data to queue for transcription
//             channel.sendToQueue(queueKeys.TRANSCRIPTION_QUEUE, Buffer.from(JSON.stringify({ relative_file_url })));
//
//             res.status(200).json({
//                 message: "File uploaded successfully",
//                 data: {
//                     id: response._id.toString(),
//                     name: response.name,
//                     file_url
//                 }
//             })
//         })
//     });
// }

exports.handleVideoEdit = async function (req, res) {
    const {id} = req.params;
    const {name} = req.body;
    if(!id){
        res.status(400).json({
            message: "Please provide an id",
        });
    }
    if(!name){
        res.status(400).json({
            message: "Please provide a name",
        });
    }

    const response = await handleVideoEditModel({id, name});
    if (!response) {
        res.status(400).json({
            message: "Video not found",
        });
    }

    // Edit video in file system
    fs.rename(`public/${id}/${response.name}${response.extension}`, `public/${id}/${name}${response.extension}`, (err) => {
        if (err){
            throw err;
        }
        res.status(200).json({
            message: "Video name edited successfully",
            data: {
                id: response._id.toString(),
                name,
                file_url: `${req.protocol}://${req.headers.host}/public/${id}/${name}${response.extension}`
            }
        })
    });
}

exports.handleFetchVideo = async function (req, res) {
    const {id} = req.params;
    if(!id){
        res.status(400).json({
            message: "Please provide an id",
        });
    }

    const response = await handleFetchVideoModel({id});
    if (!response) {
        res.status(400).json({
            message: "Video not found",
        });
    }

    const file_url = `${req.protocol}://${req.headers.host}/public/${response._id.toString()}/${response.name}${response.extension}`
    res.status(200).json({
        message: "Video fetched successfully",
        data: {
            id: response._id.toString(),
            name: response.name,
            file_url
        }
    })
}

exports.handleFetchVideos = async function (req, res) {
    const response = await handleFetchVideosModel();
    if (!response) {
        res.status(400).json({
            message: "No videos found",
        });
    }

    const videos = response.map((video) => {
        const file_url = `${req.protocol}://${req.headers.host}/public/${video._id.toString()}/${video.name}${video.extension}`
        return {
            id: video._id.toString(),
            name: video.name,
            file_url
        }
    })
    res.status(200).json({
        message: "Videos fetched successfully",
        data: videos
    })
}

exports.syncVideoFilesWithDatabase = async function (){
    const response = await handleFetchVideosModel();
    if (!response) {
        return;
    }
    const directories = fs.readdirSync('public', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    //Delete directories that are not in the database
    directories.forEach((directory) => {
        const found = response.find((video) => video._id.toString() === directory);
        if(!found){
            fs.rmdirSync(`public/${directory}`, { recursive: true });
        }
    });
};

exports.handleDeleteVideo = async function (req, res) {
    const {id} = req.params;
    if(!id){
        res.status(400).json({
            message: "Please provide an id",
        });
    }

    const response = await handleDeleteVideoModel({id});
    if (!response) {
        res.status(400).json({
            message: "Video not found",
        });
    }

    //Delete video in file system
    fs.rmdirSync(`public/${id}`, { recursive: true });

    res.status(200).json({
        message: "Video deleted successfully",
    });
}