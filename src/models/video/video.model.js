const videos = require('./video.mongo');

exports.handleVideoUpload = async function (data){
    return await videos.create({
        name: data.__filename,
        extension: data.extension,
        sessionId: data.sessionId
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

exports.handleDeleteVideo = async function (data){
    return videos.findByIdAndDelete(data.id);
}
