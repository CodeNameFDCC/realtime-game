const images = {};
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const waitingScreen = document.getElementById('waitingScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const playerStats = document.getElementById('playerStats');
let backgroundY = 0;
let player = null;
let gameState = {
    players: [],
    bullets: [],
    enemies: [],
    items: [],
    boss: null
};

let currentGameState = 'waiting';

async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
}

// loadImages 함수 정의
async function loadImages() {
    try {
        images.player = await loadImage('/assets/ships/1.png'),
            images.otherPlayer = await loadImage('/assets/ships/1B.png'),
            images.enemy = await loadImage('/assets/ships/2.png'),
            images.boss = await loadImage('/assets/ships/3.png'),
            images.explosion = await loadImage('/assets/effects/0.png'),
            images.bullet = await loadImage('/assets/bullets/0.png'),
            images.enemyBullet = await loadImage('/assets/bullets/1.png'),
            images.powerup = await loadImage('/assets/items/1.png'),
            images.bomb = await loadImage('/assets/items/0.png'),
            images.background = await loadImage('/assets/backgrounds/0.jpg')
        console.log("Images loaded", images);
        return await images;
    } catch (error) {
        console.error("Error loading images:", error);
    }

}

// loadImages 호출

loadImages();





// Debug logging function
function debug(message) {
    const debugInfo = document.getElementById('debugInfo');
    debugInfo.innerHTML += '<br>' + message;
    debugInfo.scrollTop = debugInfo.scrollHeight;
    console.log(message);
}

debug('Starting game initialization...');
//debug(images);



// Simple shapes instead of images
const shapes = {
    drawPlayer: (x, y, isCurrentPlayer) => {
        const width = 30;
        const height = 30;
        ctx.drawImage(isCurrentPlayer ? images.player : images.otherPlayer, x - 15, y, width, height);
    },
    drawEnemy: (x, y) => {
        const width = 30;
        const height = 30;
        ctx.drawImage(images.enemy, x - 15, y - 15, width, height);
        // ctx.fillStyle = '#ff0000';
        // ctx.fillRect(x - 15, y - 15, 30, 30);
    },
    drawBullet: (x, y, isEnemy) => {
        ctx.fillStyle = isEnemy ? '#ff0000' : '#ffff00';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    },
    drawItem: (x, y, type) => {
        ctx.fillStyle = type === 'powerup' ? '#00ff00' : '#ff00ff';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
    },
    drawExplosion: (x, y, frame) => {
        const size = 30 - frame * 2;
        ctx.fillStyle = `rgba(255, ${128 + frame * 16}, 0, ${1 - frame / 8})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    },
    drawBackground: (scrollY) => {
        const width = 30;
        const height = 30;
        //ctx.drawImage(images.enemy,x - 15,y-15, width,height);
        // ctx.drawImage(images.background,0,scrollY)
        ctx.drawImage(images.background, 0, scrollY);
        ctx.drawImage(images.background, 0, scrollY - canvas.height);
    },
};

debug('Shapes initialized');

// Handle keyboard input
const keys = new Set();

document.addEventListener('keydown', (e) => {
    keys.add(e.key);

    if (e.key === ' ' && currentGameState === 'waiting' || currentGameState === 'waiting' && e.code === "space") {
        //const playerName = document.getElementById('playerName').value.trim() || 'Player';
        const playerName = sessionStorage.getItem("userName");
        socket.emit('joinGame', playerName);
        debug('Join game attempt: ' + playerName);
    }

    if (e.key === 'b' && player) {
        socket.emit('useBomb');
        debug('Bomb used');
    }
});

document.addEventListener('keyup', (e) => {
    keys.delete(e.key);
});

// Socket event handlers
socket.on('connect', () => {
    debug('Connected to server');
});

socket.on('gameState', (state) => {
    gameState = state;
    player = gameState.players.find(p => p.id === socket.id);
    updatePlayerStats();
});

socket.on('explosion', (position) => {
    debug('Explosion at: ' + position.x + ',' + position.y);
    createExplosion(position.x, position.y);
});

socket.on('gameStateChange', (newState) => {
    debug('Game state changed to: ' + newState);
    currentGameState = newState;
    updateScreens();

    if (newState === 'gameOver' && player) {
        document.getElementById('finalScore').textContent = player.score;
    }
});

function updateScreens() {
    waitingScreen.style.display = currentGameState === 'waiting' ? 'block' : 'none';
    gameOverScreen.style.display = currentGameState === 'gameOver' ? 'block' : 'none';
}

function updatePlayerStats() {
    if (!player) return;
    playerStats.innerHTML = `
                <div>Name: ${player.name}</div>
                <div>Lives: ${player.lives}</div>
                <div>Score: ${player.score}</div>
                <div>Power: ${player.powerLevel}</div>
                <div>Bombs: ${player.bombs}</div>
            `;
}

const explosions = new Set();

function createExplosion(x, y) {
    explosions.add({
        x,
        y,
        frame: 0,
        startTime: Date.now()
    });
}

function gameLoop() {
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    if (currentGameState === 'playing') {
        // Update player position
        if (player && player.isAlive) {
            const speed = 5;
            if (keys.has('ArrowLeft')) player.x -= speed;
            if (keys.has('ArrowRight')) player.x += speed;
            if (keys.has('ArrowUp')) player.y -= speed;
            if (keys.has('ArrowDown')) player.y += speed;

            player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
            player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

            socket.emit('playerMove', { x: player.x, y: player.y });

            if (keys.has(' ')) {
                socket.emit('playerShoot', { x: player.x, y: player.y });
            }
        }

        shapes.drawBackground(backgroundY);

        backgroundY = (backgroundY + 2) % canvas.height;

        // Draw game objects
        gameState.items.forEach(item => {
            shapes.drawItem(item.x, item.y, item.type);
        });

        gameState.bullets.forEach(bullet => {
            shapes.drawBullet(bullet.x, bullet.y, bullet.type === 'enemy');
        });

        gameState.enemies.forEach(enemy => {
            shapes.drawEnemy(enemy.x, enemy.y);
        });

        gameState.players.forEach(p => {
            if (p.isAlive) {
                shapes.drawPlayer(p.x, p.y, p.id === socket.id);
            }
        });
    }

    // Draw explosions
    for (const explosion of explosions) {
        if (explosion.frame < 8) {
            shapes.drawExplosion(explosion.x, explosion.y, explosion.frame);
            if (Date.now() - explosion.startTime > 50) {
                explosion.frame++;
                explosion.startTime = Date.now();
            }
        } else {
            explosions.delete(explosion);
        }
    }

    requestAnimationFrame(gameLoop);
}

window.restartGame = function () {
    debug('Attempting to restart game');
    socket.emit('restartGame');
};

// Start game loop
debug('Starting game loop');
gameLoop();