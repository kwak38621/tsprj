const express = require('express');
const PubNub = require('pubnub');
const fetch = require('node-fetch'); // API 호출을 위한 fetch 패키지
const path = require('path'); // 경로 모듈 추가

const app = express();
app.use(express.json());

// 정적 파일 제공 (현재 디렉토리에서 index.html 제공)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // index.html 파일 제공
});

// API 키와 키 값을 직접 코드에 입력
const HUGGING_FACE_API_KEY = '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'; // Hugging Face API 키
const PUBNUB_PUBLISH_KEY = 'pub-c-a2c20750-f88f-4fa2-9b3a-569485cc09f1'; // PubNub 발행 키
const PUBNUB_SUBSCRIBE_KEY = 'sub-c-8af242ae-680e-4a6b-bcfa-077e49042e76'; // PubNub 구독 키

// PubNub 초기화
const pubnub = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    userId: 'user1' // 고유한 사용자 ID
});

// 메시지를 처리하는 엔드포인트
app.post('/message', async (req, res) => {
    const userMessage = req.body.message;

    try {
        // Hugging Face API 호출
        const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: userMessage })
        });

        const data = await response.json();
        const aiMessage = data[0]?.generated_text || "응답을 생성할 수 없습니다."; // 응답 처리

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
        console.error(error);
        res.status(500).send('Error communicating with Hugging Face API');
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
