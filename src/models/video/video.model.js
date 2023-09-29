const videos = require('./video.mongo');

exports.handleVideoUpload = async function (data){
    return await videos.create({
        name: data.__filename,
        extension: data.__ext
    })
}

exports.handleVideoEdit = async function (data){
    return videos.findByIdAndUpdate(data.id, {
        name: data.name
    }, {new: false});
}

exports.handleFetchVideo = async function (data){
    return videos.findById(data.id);
}

exports.handleFetchVideos = async function (){
    return videos.find();
}