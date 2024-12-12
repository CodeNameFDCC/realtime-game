// server.js
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import { Server } from 'socket.io';
import { createServer } from 'http';


const app = express();
const server = createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url); // 현재 파일 경로
const __dirname = path.dirname(__filename); // 현재 파일 디렉토리

app.use(express.static(path.join(__dirname,'../public')));

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

server.listen(3000, () => {
    console.log('Server running on port 3000');
});