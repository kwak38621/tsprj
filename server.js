/*
OPENAI_API_KEY=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
PUBNUB_PUBLISH_KEY=pub-c-a2c20750-f88f-4fa2-9b3a-569485cc09f1
PUBNUB_SUBSCRIBE_KEY=sub-c-8af242ae-680e-4a6b-bcfa-077e49042e76
*/


const express = require('express');
const PubNub = require('pubnub');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const pubnub = new PubNub({
    publishKey: process.env.PUBNUB_PUBLISH_KEY,
    subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
});

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/message', async (req, res) => {
    const userMessage = req.body.message;

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }],
        });

        const aiMessage = response.data.choices[0].message.content;
        pubnub.publish({
            channel: 'chat',
            message: { user: 'AI', text: aiMessage },
        });

        res.status(200).send({ message: aiMessage });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error communicating with OpenAI API');
    }
});

pubnub.subscribe({ channels: ['chat'] });

pubnub.addListener({
    message: function(event) {
        console.log(`Received message: ${JSON.stringify(event.message)}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
