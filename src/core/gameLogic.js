// gameLogic.js
import { initializePlayerActions } from './playerActions.js';
import { initializeBulletActions } from './bulletActions.js';
import { initializeEnemyActions } from './enemyActions.js';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const ITEM_DROP_CHANCE = 0.01; // 1% 확률로 아이템 드랍
const ENEMY_BASE_HEALTH = 2;

const gameStates = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

const gameStatus = {
    state: gameStates.WAITING // 초기 상태 설정
};
const players = new Map();
const bullets = new Set();
const enemies = new Set();
const items = new Set();
let boss = null;

export function initializeGame(io) {
    io.on('connection', (socket) => {
        console.log('Player connected:', socket.id);

        // 각 기능 초기화
        initializePlayerActions(io, socket, players, gameStates, gameStatus);
        initializeBulletActions(io, socket, bullets);
        initializeEnemyActions(io, socket, enemies, gameStatus);


    });

    // 게임 루프 설정
    setInterval(() => {
        if (gameStatus.state !== gameStates.PLAYING) return;

        updateGameLogic();
        io.emit('gameState', {
            players: Array.from(players.values()),
            bullets: Array.from(bullets),
            enemies: Array.from(enemies),
            items: Array.from(items),
            boss: boss
        });
    }, 1000 / 60); // 60 FPS
}

// 게임 로직 업데이트 함수
function updateGameLogic() {
    // 총알 업데이트
    for (const bullet of bullets) {
        bullet.y -= bullet.type === 'player' ? 7 : 5; // 플레이어와 적의 총알 속도 차이

        // 화면 밖으로 나간 총알 제거
        if (bullet.y < 0 || bullet.y > GAME_HEIGHT) {
            bullets.delete(bullet);
        }
    }

    // 적 스폰
    if (Math.random() < 0.02) {
        enemies.add({
            id: Date.now(),
            x: Math.random() * GAME_WIDTH,
            y: -30,
            health: ENEMY_BASE_HEALTH
        });
    }

    // 적 업데이트
    for (const enemy of enemies) {
        enemy.y += 2; // 적의 이동 속도

        // 화면 밖으로 나간 적 제거
        if (enemy.y > GAME_HEIGHT) {
            enemies.delete(enemy);
        }
    }

    // 충돌 감지 및 처리
    checkCollisions();
}

// 충돌 감지 및 처리 함수
function checkCollisions() {
    for (const player of players.values()) {
        if (!player.isAlive) continue;

        // 적과의 충돌 감지
        for (const enemy of enemies) {
            if (checkCollision(player, enemy)) {
                player.lives--;
                player.isAlive = player.lives > 0;

                enemies.delete(enemy);
                // 추가적인 폭발 효과 전송
                // io.emit('explosion', { x: enemy.x, y: enemy.y });
            }
        }

        // 총알과의 충돌 감지
        for (const bullet of bullets) {
            if (bullet.type === 'enemy' && checkCollision(player, bullet)) {
                player.lives--;
                player.isAlive = player.lives > 0;
                bullets.delete(bullet);
            }
        }
    }

    // 게임 종료 조건 체크
    if (checkAllPlayersDead()) {
        gameStatus.state = gameStates.GAME_OVER;
        // io.emit('gameStateChange', gameState);
    }
}

// 충돌 감지 함수
function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 30; // 충돌 반경
}

// 모든 플레이어가 죽었는지 체크
function checkAllPlayersDead() {
    for (const player of players.values()) {
        if (player.isAlive) return false;
    }
    return true;
}
