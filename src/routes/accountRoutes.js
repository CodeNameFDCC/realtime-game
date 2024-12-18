import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();


//#region 사이트에서 접근하는 내용

let users = []; // 사용자 저장소
let refreshTokens = {}; // 사용자별 refresh token 저장소

router.post("/register", (req, res) => {
    const { userName: userName, password } = req.body;
    console.log(userName, password);
    const userExists = users.find((user) => user.userName === userName);

    if (userExists) {
        console.log("이미 있는 계정");
        return res.status(400).send({ message: "User already exists" });
    }

    users.push({ userName: userName, password });
    res.status(201).send({ message: "User registered" });
});

// 로그인
router.post("/login", (req, res) => {
    const { userName: userName, password } = req.body;
    const user = users.find(
        (u) => u.userName === userName && u.password === password
    );

    if (!user) return res.status(403).send("Invalid credentials");

    // 기존 리프레시 토큰 무효화
    if (refreshTokens[userName]) {
        delete refreshTokens[userName];
    }

    const accessToken = jwt.sign(
        { userName: userName },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "15m",
        }
    );
    const refreshToken = jwt.sign(
        { userName: userName },
        process.env.REFRESH_TOKEN_SECRET
    );

    console.log(accessToken);
    console.log(refreshToken);
    // 새로운 리프레시 토큰 저장
    refreshTokens[userName] = refreshToken;
    res.status(200).json({
        username: userName,
        accessToken: accessToken,
        refreshToken: refreshToken,
    });
});

// 액세스 토큰 갱신
router.post("/token", (req, res) => {
    const { token } = req.body;
    const username = Object.keys(refreshTokens).find(
        (user) => refreshTokens[user] === token
    );

    if (!username || !token) return res.sendStatus(403);

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign(
            { username: user.username },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );
        res.json({ accessToken });
    });
});

// 로그아웃
router.delete("/logout", (req, res) => {
    const { token } = req.body;

    const username = Object.keys(refreshTokens).find(
        (user) => refreshTokens[user] === token
    );

    if (username) {
        delete refreshTokens[username]; // 해당 사용자의 리프레시 토큰 삭제
    }

    res.sendStatus(204);
});

// 액세스 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401); // 토큰이 없으면 401 Unauthorized

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // 토큰이 유효하지 않으면 403 Forbidden
        req.user = user; // 요청에 사용자 정보를 추가
        next(); // 다음 미들웨어 또는 라우터로 진행
    });
};

// 보호된 사용자 정보 API
router.get("/user", authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

//#endregion


export default router;