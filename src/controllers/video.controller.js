const fs = require("fs");
const {parse} = require("path");
const {
    handleVideoUpload:handleVideoUploadModel,
    handleVideoEdit: handleVideoEditModel,
    handleFetchVideo: handleFetchVideoModel,
    handleFetchVideos: handleFetchVideosModel,
    handleDeleteVideo: handleDeleteVideoModel,
} = require("../models/video/video.model");
const path = require("path");

exports.handleVideoUpload = async function (req, res) {
    const file = req.file;
    const {filename} = file;
    const __filename = parse(filename).name;
    const __ext = parse(filename).ext;
    if (!file) {
        res.status(400).json({
            message: "Please upload a file",
        });
    }

    const response = await handleVideoUploadModel({__filename, __ext});
    if(!response){
        res.status(500).json({
            message: "Something went wrong, video not uploaded",
        });
    }

    // Create a folder in the public direction named with the id of the video and move the old one
    fs.mkdir(`public/${response._id.toString()}`, (err) => {
        if (err){
            throw err;
        }
        fs.rename(`public/${filename}`, `public/${response._id.toString()}/${filename}`, (err) => {
            if (err){
                throw err;
            }
            const file_url = `${req.protocol}://${req.headers.host}/public/${response._id.toString()}/${filename}`
            res.status(200).json({
                message: "File uploaded successfully",
                data: {
                    id: response._id.toString(),
                    name: response.name,
                    file_url
                }
            })
        })
    });
}

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