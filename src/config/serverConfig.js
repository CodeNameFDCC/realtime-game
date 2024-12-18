// serverConfig.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 서버 포트 설정
const PORT = process.env.PORT || 3000;

// CORS 설정
const corsOptions = {
    origin: '*', // 모든 도메인 허용 (필요에 따라 수정)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

// Express 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 미들웨어 적용
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', corsOptions.origin);
    res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    next();
});

// io를 export
export { io, server, PORT, app };
