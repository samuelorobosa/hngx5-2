const {connection, connect} = require('mongoose');
require('dotenv').config();


const MONGO_URL = process.env.MONGO_URL;

connection.once('open', () => {
    console.log('MongoDB connection ready!');
});

connection.on('error', (err) => {
    console.error(err);
});

async function mongoConnect() {
    await connect(MONGO_URL);
}

module.exports = {
    mongoConnect,
}