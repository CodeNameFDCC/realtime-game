import { getStage, stageUpdate } from '../managers/stageManager.js'
import { spawnEnemy } from '../managers/enemyManager.js';

// 게임 업데이트 관련 상수
const GAME_HEIGHT = 600;
const GAME_WIDTH = 800;
const ENEMY_SHOOT_DELAY = 1000;

// 스테이지별 적 스폰 설정
const STAGE_SETTINGS = {
    1: {
        spawnInterval: 3000,  // 3초마다 스폰
        enemyHealth: 1,
        enemySpeed: 2
    },
    2: {
        spawnInterval: 2000,  // 2초마다 스폰
        enemyHealth: 2,
        enemySpeed: 2.5
    },
    3: {
        spawnInterval: 1500,  // 1.5초마다 스폰
        enemyHealth: 3,
        enemySpeed: 3
    }

};
let lastEnemySpawnTime = 0;  // 마지막 적 스폰 시간 추적


export function updateBullets(bullets) {
    for (const bullet of bullets) {
        if (bullet.type === 'player') {
            bullet.y -= 7;
        } else {
            bullet.y += 5;
        }

        if (bullet.y < 0 || bullet.y > GAME_HEIGHT) {
            bullets.delete(bullet);
        }
    }
}

export function spawnEnemies(enemies) {
    const currentTime = Date.now();
    const stageConfig = STAGE_SETTINGS[getStage()] || STAGE_SETTINGS[1];  // 설정이 없으면 1스테이지 설정 사용

    // 마지막 스폰 시간과 현재 시간의 차이가 스폰 간격보다 크면 적 생성
    if (currentTime - lastEnemySpawnTime >= stageConfig.spawnInterval) {
        enemies.add({
            id: currentTime,
            x: Math.random() * GAME_WIDTH,
            y: -30,
            health: stageConfig.enemyHealth,
            lastShootTime: null,
            speed: stageConfig.enemySpeed
        });
        lastEnemySpawnTime = currentTime;
        spawnEnemy();
    }
}

export function updateEnemies(enemies, bullets) {
    const currentTime = Date.now();
    for (const enemy of enemies) {
        enemy.y += enemy.speed;  // 개별 적의 속도 사용

        if (!enemy.lastShootTime || currentTime - enemy.lastShootTime >= ENEMY_SHOOT_DELAY) {
            if (Math.random() < 0.01) {
                bullets.add({
                    id: currentTime,
                    x: enemy.x,
                    y: enemy.y,
                    type: 'enemy',
                    damage: 1
                });
                enemy.lastShootTime = currentTime;
            }
        }

        if (enemy.y > GAME_HEIGHT) {
            enemies.delete(enemy);
        }
    }
}

export function updateItems(items) {
    for (const item of items) {
        item.y += 1;
        if (item.y > GAME_HEIGHT) {
            items.delete(item);
        }
    }
}