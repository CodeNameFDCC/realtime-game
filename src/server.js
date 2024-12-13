// server.js
import express from 'express';
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { createServer } from 'http';

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server);

let users = []; // 사용자 저장소
let refreshTokens = {}; // 사용자별 refresh token 저장소

app.use(cors());
app.use(bodyParser.json());


const __filename = fileURLToPath(import.meta.url); // 현재 파일 경로
const __dirname = path.dirname(__filename); // 현재 파일 디렉토리

app.use(express.static(path.join(__dirname, '../public')));


//#region 사이트에서 접근하는 내용

app.post("/register", (req, res) => {
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
app.post("/login", (req, res) => {
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
app.post("/token", (req, res) => {
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
app.delete("/logout", (req, res) => {
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
app.get("/user", authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

//#endregion

//#region 게임에서 소켓으로 접근하는 내용용

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const ITEM_DROP_CHANCE = 0.01; // 1% 확률로 아이템 드랍
const ENEMY_BASE_HEALTH = 2;

const gameStates = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

let gameState = gameStates.WAITING;
const players = new Map();
const bullets = new Set();
const enemies = new Set();
const items = new Set();
let boss = null;

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('joinGame', (playerName) => {
        if (gameState === gameStates.WAITING) {
            gameState = gameStates.PLAYING;
        }

        players.set(socket.id, {
            id: socket.id,
            name: playerName,
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT - 50,
            lives: 3,
            score: 0,
            powerLevel: 1,
            bombs: 0,
            isAlive: true
        });

        io.emit('updatePlayers', Array.from(players.values()));
        io.emit('gameStateChange', gameState);
    });

    socket.on('playerMove', (position) => {
        const player = players.get(socket.id);
        if (player && player.isAlive) {
            player.x = position.x;
            player.y = position.y;
            io.emit('updatePlayers', Array.from(players.values()));
        }
    });

    socket.on('playerShoot', (bulletData) => {
        const player = players.get(socket.id);
        if (player && player.isAlive) {
            bullets.add({
                id: Date.now(),
                x: bulletData.x,
                y: bulletData.y,
                playerId: socket.id,
                type: 'player',
                damage: player.powerLevel
            });
            io.emit('updateBullets', Array.from(bullets));
        }
    });

    socket.on('useBomb', () => {
        const player = players.get(socket.id);
        if (player && player.isAlive && player.bombs > 0) {
            player.bombs--;

            // Clear bullets and damage all enemies
            bullets.clear();

            // Handle enemies
            for (const enemy of enemies) {
                enemy.health = 0;
                spawnItemOnEnemyDeath(enemy);
                enemies.delete(enemy);
                io.emit('explosion', { x: enemy.x, y: enemy.y });
            }

            // Damage boss if exists
            if (boss) {
                boss.health -= 50;
                if (boss.health <= 0) {
                    io.emit('explosion', { x: boss.x, y: boss.y });
                    boss = null;
                }
            }

            io.emit('bombUsed', socket.id);
            io.emit('updatePlayers', Array.from(players.values()));
        }
    });

    socket.on('restartGame', () => {
        const player = players.get(socket.id);
        if (player) {
            player.lives = 3;
            player.score = 0;
            player.powerLevel = 1;
            player.bombs = 2;
            player.isAlive = true;
            player.x = GAME_WIDTH / 2;
            player.y = GAME_HEIGHT - 50;

            io.emit('updatePlayers', Array.from(players.values()));

            if (gameState === gameStates.GAME_OVER) {
                gameState = gameStates.PLAYING;
                io.emit('gameStateChange', gameState);
            }
        }
    });

    socket.on('disconnect', () => {
        players.delete(socket.id);
        io.emit('updatePlayers', Array.from(players.values()));

        if (players.size === 0) {
            gameState = gameStates.WAITING;
            io.emit('gameStateChange', gameState);
        }
    });
});

function spawnItemOnEnemyDeath(enemy) {
    if (Math.random() < ITEM_DROP_CHANCE) {
        items.add({
            id: Date.now(),
            x: enemy.x,
            y: enemy.y,
            type: Math.random() < 0.7 ? 'powerup' : 'bomb'
        });
    }
}

function checkAllPlayersDead() {
    for (const player of players.values()) {
        if (player.isAlive) return false;
    }
    return true;
}

// Game loop
setInterval(() => {
    if (gameState !== gameStates.PLAYING) return;

    // Update bullets
    for (const bullet of bullets) {
        if (bullet.type === 'player') {
            bullet.y -= 7;
        } else {
            bullet.y += 5;
        }

        // Remove bullets that are off screen
        if (bullet.y < 0 || bullet.y > GAME_HEIGHT) {
            bullets.delete(bullet);
        }
    }

    // Spawn enemies
    if (Math.random() < 0.02) {
        enemies.add({
            id: Date.now(),
            x: Math.random() * GAME_WIDTH,
            y: -30,
            health: ENEMY_BASE_HEALTH
        });
    }

    // Update enemies
    for (const enemy of enemies) {
        enemy.y += 2;

        // Enemy shooting
        if (Math.random() < 0.01) {
            bullets.add({
                id: Date.now(),
                x: enemy.x,
                y: enemy.y,
                type: 'enemy',
                damage: 1
            });
        }

        // Remove enemies that are off screen
        if (enemy.y > GAME_HEIGHT) {
            enemies.delete(enemy);
        }
    }

    // Update items
    for (const item of items) {
        item.y += 1;
        if (item.y > GAME_HEIGHT) {
            items.delete(item);
        }
    }

    // Collision detection
    for (const player of players.values()) {
        if (!player.isAlive) continue;

        // Check enemy collisions
        for (const enemy of enemies) {
            if (checkCollision(player, enemy)) {
                player.lives--;
                player.isAlive = player.lives > 0;
                enemies.delete(enemy);
                io.emit('explosion', { x: enemy.x, y: enemy.y, duration: 100 });

                if (!player.isAlive) {
                    // Drop power-up on death
                    if (player.powerLevel > 1) {
                        items.add({
                            id: Date.now(),
                            x: player.x,
                            y: player.y,
                            type: 'powerup'
                        });
                    }
                }
            }
        }

        // Check bullet collisions
        for (const bullet of bullets) {
            if (bullet.type === 'enemy' && checkCollision(player, bullet)) {
                player.lives--;
                player.isAlive = player.lives > 0;
                bullets.delete(bullet);
            }
        }

        // Check item collisions
        for (const item of items) {
            if (checkCollision(player, item)) {
                if (item.type === 'powerup') {
                    player.powerLevel = Math.min(player.powerLevel + 1, 3);
                } else if (item.type === 'bomb') {
                    player.bombs++;
                }
                items.delete(item);
            }
        }
    }

    // Check player bullets hitting enemies
    for (const bullet of bullets) {
        if (bullet.type === 'player') {
            for (const enemy of enemies) {
                if (checkCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage;
                    bullets.delete(bullet);

                    if (enemy.health <= 0) {
                        const player = players.get(bullet.playerId);
                        if (player) {
                            player.score += 100;
                        }

                        spawnItemOnEnemyDeath(enemy);
                        enemies.delete(enemy);
                        io.emit('explosion', { x: enemy.x, y: enemy.y, duration: 100 });
                    }
                    break;
                }
            }
        }
    }

    // Check game over condition
    if (checkAllPlayersDead()) {
        gameState = gameStates.GAME_OVER;
        io.emit('gameStateChange', gameState);
    }

    // Send updates to all clients
    io.emit('gameState', {
        players: Array.from(players.values()),
        bullets: Array.from(bullets),
        enemies: Array.from(enemies),
        items: Array.from(items),
        boss: boss
    });
}, 1000 / 60);

function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 30; // Collision radius
}

//#endregion

server.listen(3000, () => {
    console.log('Server running on port 3000');
});