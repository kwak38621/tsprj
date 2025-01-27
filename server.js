const express = require('express');
const PubNub = require('pubnub');
const { OpenAI } = require('openai'); // OpenAI 라이브러리 가져오기
const path = require('path');

const app = express();
app.use(express.json());

// 정적 파일 제공 (현재 디렉토리에서 index.html 제공)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PUBNUB_PUBLISH_KEY = 'pub-c-a2c20750-f88f-4fa2-9b3a-569485cc09f1'; // PubNub 발행 키
const PUBNUB_SUBSCRIBE_KEY = 'sub-c-8af242ae-680e-4a6b-bcfa-077e49042e76'; // PubNub 구독 키

// PubNub 초기화
const pubnub = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    userId: 'user1'
});

// 메시지를 처리하는 엔드포인트
app.post('/message', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).send('메시지가 필요합니다.');
    }

    try {
        // OpenAI API 호출
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }]
        });

        const aiMessage = response.choices[0]?.message?.content || "응답을 생성할 수 없습니다.";

        // PubNub에 AI 메시지 발행
        pubnub.publish({
            channel: 'chat',
            message: { user: 'AI', text: aiMessage },
        }, (status, response) => {
            if (status.error) {
                console.log("Error publishing message:", status);
            } else {
                console.log("Message Published: ", response);
            }
        });

        // 사용자에게 AI 메시지 응답
        res.status(200).send({ message: aiMessage });
    } catch (error) {
        if (error.status === 429) {
            console.error("쿼터 초과 오류:", error.message);
            res.status(429).send('API 요청 수를 초과했습니다. 요금제와 사용량을 확인하세요.');
        } else {
            console.error("OpenAI API와의 통신 중 오류:", error.message);
            res.status(500).send('OpenAI API와의 통신 중 오류가 발생했습니다.');
        }
    }
    
});


// PubNub 구독
pubnub.subscribe({ channels: ['chat'] });

// PubNub 메시지 리스너
pubnub.addListener({
    message: function(event) {
        console.log(`Received message: ${JSON.stringify(event.message)}`);
    }
});

// 서버 시작
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
