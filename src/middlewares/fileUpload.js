const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: 'public/',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, 'Untitled_Video' + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = function (req, file, callback) {
    const allowedFileTypes = ['video/mp4', 'video/mov', 'video/mkv', 'video/webm' ];
    if (!allowedFileTypes.includes(file.mimetype)) {
        return callback(new Error(`Only videos of type ${allowedFileTypes.join(' or ')} are allowed`));
    }
    callback(null, true);
};

const fileUpload = multer({ storage, fileFilter });

function uploadFile(req, res, next) {
    const singleUpload = fileUpload.single('video');

    singleUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({error: err.message });
        }
        next();
    });
}

module.exports = uploadFile;