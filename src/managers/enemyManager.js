let enemyData = {};
let totalEnemyCount = 0;
export function getEnemy(id) {
    return enemyData.id.enemyKillCount;
}
export function initEnemy(id) {
    enemyData.id = {
        id,
        enemyKillCount: 0,
        updateTime: Date.now()
    }
}
export function resetEnemy() {
    enemyData = 0;
    totalEnemyCount = 0;
}
export function killEnemy(id) {
    enemyData.id.enemyKillCount++;
    console.log(`${id} 가 적을 ${enemyData.id.enemyKillCount} 만큼 잡았습니다.`);
}
export function spawnEnemy() {
    totalEnemyCount++;
}