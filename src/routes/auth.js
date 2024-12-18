import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
const users = [];
const refreshTokens = {};
app.use(express.json());

// 회원가입
app.post("/register", (req, res) => {
    const { userName, password } = req.body;
    console.log(userName, password);
    const userExists = users.find((user) => user.userName === userName);

    if (userExists) {
        console.log("이미 있는 계정");
        return res.status(400).send({ message: "User already exists" });
    }

    users.push({ userName, password });
    res.status(201).send({ message: "User registered" });
});

// 로그인
app.post("/login", (req, res) => {
    const { userName, password } = req.body;
    const user = users.find((u) => u.userName === userName && u.password === password);

    if (!user) return res.status(403).send("Invalid credentials");

    if (refreshTokens[userName]) {
        delete refreshTokens[userName];
    }

    const accessToken = jwt.sign({ userName }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userName }, process.env.REFRESH_TOKEN_SECRET);

    console.log(accessToken);
    console.log(refreshToken);
    refreshTokens[userName] = refreshToken;
    res.status(200).json({ username: userName, accessToken, refreshToken });
});

// 액세스 토큰 갱신
app.post("/token", (req, res) => {
    const { token } = req.body;
    const username = Object.keys(refreshTokens).find((user) => refreshTokens[user] === token);

    if (!username || !token) return res.sendStatus(403);

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
        res.json({ accessToken });
    });
});

// 로그아웃
app.delete("/logout", (req, res) => {
    const { token } = req.body;
    const username = Object.keys(refreshTokens).find((user) => refreshTokens[user] === token);

    if (username) {
        delete refreshTokens[username];
    }

    res.sendStatus(204);
});

// 액세스 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 보호된 사용자 정보 API
app.get("/user", authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

export default app; // app 객체를 내보냄
