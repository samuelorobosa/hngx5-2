const fs = require("fs");
const https = require('https')
const { execSync: exec } = require('child_process')
const { Deepgram } = require('@deepgram/sdk');
const {parse, join} = require("path");
const mime = require('mime');
const {
    handleVideoUpload:handleVideoUploadModel,
    handleVideoEdit: handleVideoEditModel,
    handleFetchVideo: handleFetchVideoModel,
    handleFetchVideos: handleFetchVideosModel,
    handleDeleteVideo: handleDeleteVideoModel,
} = require("../models/video/video.model");
const { v4: uuidv4 } = require('uuid');
const {setupLavinMQ} = require("../services/transcription");
const {queueKeys} = require("../utils/queueKeys");


exports.handleStartChunk = async function (req, res)  {
    try {
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
    } catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

exports.handleVideoUpload = async function (req, res)  {
    try {
        const chunkNumber = req.headers['chunk-number'];
        const sessionId = req.headers['session-id'];
        const directoryPath = join('public', sessionId, 'chunks');
        const filePath = join(directoryPath, `chunk${chunkNumber}`);

        if (!chunkNumber){
            res.status(400).json({
                message: 'Chunk Number not found in request header'
            })
        }

        if (!sessionId){
            res.status(400).json({
                message: 'Session ID not found in request header'
            })
        }

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
    } catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        })
    }

}

exports.handleAssembleVideo = async function (req, res)  {
    try {
        const extension = req.headers['file-type'].split('/')[1];
        const {sessionId} = req.body;

        if (!extension){
            res.status(400).json({
                message: 'File Type not found in request header'
            })
        }

        if (!sessionId){
            res.status(400).json({
                message: 'Session ID not found in request body'
            })
        }
        const __filename = 'Untitled-Video'
        const sessionDir = join('public', sessionId, 'chunks');
        const outputFilePath = join('public', `${sessionId}`, `${__filename}.${extension}`);
        const writeStream = fs.createWriteStream(outputFilePath);

        for (const file of fs.readdirSync(sessionDir)) {
            const chunk = fs.readFileSync(join(sessionDir, file));
            writeStream.write(chunk);
        }

        writeStream.end();

        writeStream.on('finish', async () => {
            fs.rmdirSync(sessionDir, { recursive: true });
        })

        //Create the entry on the database
        const response = await handleVideoUploadModel({__filename, extension, sessionId});
        if(!response){
            res.status(500).json({
                message: "Something went wrong, video not uploaded",
            });
        }

        const relative_file_url = `/public/${sessionId}/${__filename}.${extension}`;
        const file_url = `${req.protocol}://${req.headers.host}${relative_file_url}`;

        // Send to transcription queue
        // const channel = await setupLavinMQ();
        // channel.sendToQueue(queueKeys.TRANSCRIPTION_QUEUE, Buffer.from(JSON.stringify({ relative_file_url })));

        // Send final response
        res.status(200).json({
            message: "Video assembled successfully",
            data: {
                id: response._id.toString(),
                name: response.name,
                file_url
            }
        });
    } catch (e) {
        console.error("Error:", error);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

exports.handleStreamVideo = async function (req, res)  {
    try {
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
        const videoPath = join('public', response.sessionId, `${response.name}.${response.extension}`);
        const stat = fs.statSync(videoPath);

        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size
        });

        const videoStream = fs.createReadStream(videoPath);
        videoStream.pipe(res);
    } catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        })
    }

}

exports.handleVideoEdit = async function (req, res) {
    try {
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
        fs.rename(`public/${response.sessionId}/${response.name}.${response.extension}`, `public/${response.sessionId}/${name}${response.extension}`, (err) => {
            if (err){
                throw err;
            }
            res.status(200).json({
                message: "Video name edited successfully",
                data: {
                    id: response._id.toString(),
                    name,
                    file_url: `${req.protocol}://${req.headers.host}/public/${response.sessionId}/${name}.${response.extension}`
                }
            })
        });
    } catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }

}

exports.handleFetchVideos = async function (req, res) {
    try {
        const response = await handleFetchVideosModel();
        if (!response) {
            res.status(400).json({
                message: "No videos found",
            });
        }

        const videos = response.map((video) => {
            const file_url = `${req.protocol}://${req.headers.host}/public/${video.sessionId}/${video.name}.${video.extension}`
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
    } catch (e){
        res.status(500).json({
            message: "Internal Server Error",
        })
    }

}

exports.handleFetchVideo = async function (req, res) {
    try {
        const {id} = req.params;
        if(!id){
            res.status(400).json({
                message: "Please provide an id",
            });
        }
        const response = await handleFetchVideoModel({id});
        res.status(200).json({
            message: "Video fetched successfully",
            data: {
                id: response._id.toString(),
                name: response.name,
                file_url: `${req.protocol}://${req.headers.host}/public/${response.sessionId}/${response.name}.${response.extension}`
            }
        })
    } catch (e){
        res.status(500).json({
            message: "Internal Server Error",
        })
    }

}

exports.handleDeleteVideo = async function (req, res) {
    try {
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
    } catch (e) {
        res.status(500).json({
            message: "Internal Server Error",
        })
    }

}

exports.handleTranscribeVideo = async function (req, res) {
    try {
        const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
        const {id} = req.params;
        if(!id){
            res.status(400).json({
                message: "Please provide an id",
            });
        }
        const response = await handleFetchVideoModel({id});
        const filePath = join('public', response.sessionId, `${response.name}.${response.extension}`);
        return new Promise(async (resolve, reject) => {
            try {
                const response = await deepgram.transcription.preRecorded({
                    stream: fs.createReadStream(filePath),
                    mimetype: mime.getType(filePath),
                })
                const result = response.results.channels[0].alternatives[0].transcript;
                res.status(200).json({
                    message: 'Transcription successful',
                    data: result
                });
            } catch (e) {
                console.error("Error during transcription", e);
                reject(e);
            }
        })
    } catch (e) {
       res.status(500).json({
           message: "Internal Server Error",
       })
    }

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
        const found = response.find((video) => video.sessionId === directory);
        if(!found){
            fs.rmdirSync(`public/${directory}`, { recursive: true });
        }
    });
};
