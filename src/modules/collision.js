import { killEnemy } from "../managers/enemyManager.js";
import { addScore, getStage } from "../managers/stageManager.js";
import { updateScore } from "../managers/socreManager.js";
import { getItemRate } from "../managers/itemManager.js";

const ITEM_DROP_CHANCE = 0.1; // 1% 확률로 아이템 드랍



// 충돌 감지 관련 함수들
export function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 30; // Collision radius
}

export function handleCollisions(players, enemies, bullets, items, io) {
    // 충돌 감지 처리
    for (const player of players.values()) {
        if (!player.isAlive) continue;

        // Check enemy collisions
        checkPlayerEnemyCollisions(player, enemies, items, io);

        // Check bullet collisions
        checkPlayerBulletCollisions(player, bullets);

        // Check item collisions
        checkPlayerItemCollisions(player, items);
    }

    // Check player bullets hitting enemies
    checkBulletEnemyCollisions(players, bullets, enemies, items, io);
}

function checkPlayerEnemyCollisions(player, enemies, items, io) {
    for (const enemy of enemies) {
        if (checkCollision(player, enemy)) {
            killEnemy(player.id);
            player.lives--;
            player.isAlive = player.lives > 0;
            enemies.delete(enemy);
            io.emit('explosion', { x: enemy.x, y: enemy.y, duration: 100 });

            if (!player.isAlive && player.powerLevel > 1) {
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

function checkPlayerBulletCollisions(player, bullets) {
    for (const bullet of bullets) {
        if (bullet.type === 'enemy' && checkCollision(player, bullet)) {
            player.lives--;
            player.isAlive = player.lives > 0;
            bullets.delete(bullet);
        }
    }
}

function checkPlayerItemCollisions(player, items) {
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

function checkBulletEnemyCollisions(players, bullets, enemies, items, io) {
    for (const bullet of bullets) {
        if (bullet.type === 'player') {
            for (const enemy of enemies) {
                if (checkCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage;
                    bullets.delete(bullet);

                    if (enemy.health <= 0) {
                        const player = players.get(bullet.playerId);
                        if (player) {
                            const currentStage = getStage();
                            let stageScore = addScore(currentStage);
                            updateScore(player.id, currentStage, stageScore);

                            player.score += stageScore;
                            killEnemy(player.id);
                        }
                        spawnItemOnEnemyDeath(enemy, items);
                        enemies.delete(enemy);
                        io.emit('explosion', { x: enemy.x, y: enemy.y, duration: 100 });
                    }
                    break;
                }
            }
        }
    }
}

export function spawnItemOnEnemyDeath(enemy, items) {
    if (Math.random() < getItemRate(getStage())) {
        items.add({
            id: Date.now(),
            x: enemy.x,
            y: enemy.y,
            type: Math.random() < 0.7 ? 'powerup' : 'bomb'
        });
    }
}


