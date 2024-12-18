import { handleCollisions, spawnItemOnEnemyDeath } from './collision.js';
import { updateBullets, spawnEnemies, updateEnemies, updateItems } from '../core/gameLoop.js';
import { initEnemy } from '../managers/enemyManager.js';
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export const gameStates = {
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
let shootDelay = 500;
let lastShootTime = {};

export function initializeSocketHandlers(io) {
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
                isAlive: true,
                width: 30,
                height: 30
            });
            initEnemy(socket.id);

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
            const currentTime = Date.now();
            if (player && player.isAlive && (!lastShootTime[socket.id] || currentTime - lastShootTime[socket.id] >= shootDelay)) {
                lastShootTime[socket.id] = currentTime;
                bullets.add({
                    id: Date.now(),
                    x: bulletData.x,
                    y: bulletData.y,
                    width: 5,
                    height: 10,
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

                bullets.clear();

                for (const enemy of enemies) {
                    enemy.health = 0;
                    spawnItemOnEnemyDeath(enemy, items);
                    enemies.delete(enemy);
                    io.emit('explosion', { x: enemy.x, y: enemy.y });
                }

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

    startGameLoop(io);
}

function startGameLoop(io) {
    setInterval(() => {
        if (gameState !== gameStates.PLAYING) return;

        updateBullets(bullets);
        spawnEnemies(enemies);
        updateEnemies(enemies, bullets);
        updateItems(items);

        handleCollisions(players, enemies, bullets, items, io);

        if (checkAllPlayersDead()) {
            gameState = gameStates.GAME_OVER;
            io.emit('gameStateChange', gameState);
        }

        io.emit('gameState', {
            players: Array.from(players.values()),
            bullets: Array.from(bullets),
            enemies: Array.from(enemies),
            items: Array.from(items),
            boss: boss
        });
    }, 1000 / 60);
}

function checkAllPlayersDead() {
    for (const player of players.values()) {
        if (player.isAlive) return false;
    }
    return true;
}

export const gameData = {
    players,
    bullets,
    enemies,
    items,
    boss,
    gameState,
    gameStates
};