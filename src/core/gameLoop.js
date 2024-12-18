// 게임 업데이트 관련 상수
const GAME_HEIGHT = 600; // 게임 높이
const GAME_WIDTH = 800; // 게임 너비
const ENEMY_BASE_HEALTH = 3; // 적의 기본 체력
const ENEMY_SHOOT_DELAY = 1000; // 1초 (1000ms) 딜레이

export function updateBullets(bullets) {
    for (const bullet of bullets) {
        if (bullet.type === 'player') {
            bullet.y -= 7; // 플레이어 총알은 위로 이동
        } else {
            bullet.y += 5; // 적 총알은 아래로 이동
        }

        // Remove bullets that are off screen
        if (bullet.y < 0 || bullet.y > GAME_HEIGHT) {
            bullets.delete(bullet); // 화면 밖으로 나간 총알 삭제
        }
    }
}

export function spawnEnemies(enemies) {
    if (Math.random() < 0.02) {
        enemies.add({
            id: Date.now(),
            x: Math.random() * GAME_WIDTH,
            y: -30,
            health: ENEMY_BASE_HEALTH,
            lastShootTime: null
        });
    }
}

export function updateEnemies(enemies, bullets) {
    const currentTime = Date.now(); // 현재 시간
    for (const enemy of enemies) {
        enemy.y += 2; // 적은 아래로 이동
        if (!enemy.lastShootTime || currentTime - enemy.lastShootTime >= ENEMY_SHOOT_DELAY) {
            // Enemy shooting
            if (Math.random() < 0.01) {
                bullets.add({
                    id: Date.now(),
                    x: enemy.x,
                    y: enemy.y,
                    type: 'enemy',
                    damage: 1
                });
                enemy.lastShootTime = currentTime; // 발사 시간 업데이트
            }
        }

        // Remove enemies that are off screen
        if (enemy.y > GAME_HEIGHT) {
            enemies.delete(enemy); // 화면 밖으로 나간 적 삭제
        }
    }
}

export function updateItems(items) {
    for (const item of items) {
        item.y += 1; // 아이템은 아래로 이동
        if (item.y > GAME_HEIGHT) {
            items.delete(item); // 화면 밖으로 나간 아이템 삭제
        }
    }
}
