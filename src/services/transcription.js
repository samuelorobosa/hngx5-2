const amqp = require("amqplib");
const {queueKeys} = require("../utils/queueKeys");
const {Deepgram} = require("@deepgram/sdk");

async function setupLavinMQ () {
    try {
        const connection = await amqp.connect("amqp://localhost:8000");
        const channel    = await connection.createChannel();
        await channel.assertQueue(queueKeys.TRANSCRIPTION_QUEUE, {durable: true});
        return channel;
    } catch (error) {
        console.log(error)
    }
}

async function startTranscriptionWorker() {
    const channel = await setupLavinMQ();
    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

    channel.consume('transcriptionQueue', async (msg) => {
        const { videoFilePath } = JSON.parse(msg.content.toString());

        try {
            // Transcribe the video using Whisper API
            const transcriptionResult = await transcribeVideo(videoFilePath);

            // Save the transcription result and metadata
            // Implement this part to save the result to a database or filesystem

            console.log('Transcription completed:', transcriptionResult);
            channel.ack(msg); // Acknowledge message
        } catch (error) {
            console.error('Error during transcription:', error);
            channel.reject(msg, false); // Reject message and optionally requeue
        }
    });
}

// startTranscriptionWorker().then(r => console.log(r));

module.exports = setupLavinMQ;
