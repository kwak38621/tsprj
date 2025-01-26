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
