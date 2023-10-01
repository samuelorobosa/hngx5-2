const amqp = require("amqplib");
const {queueKeys} = require("../utils/queueKeys");

exports.setupRabbitMQ = async function () {
    try {
        const connection = await amqp.connect("amqp://localhost:8000");
        const channel    = await connection.createChannel();
        await channel.assertQueue(queueKeys.TRANSCRIPTION_QUEUE);
        return channel;
    } catch (error) {
        console.log(error)
    }
}