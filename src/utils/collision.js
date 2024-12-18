// collision.js

// 두 객체 간의 충돌 감지 함수
export function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (obj1.radius + obj2.radius); // 충돌 반경
}

// 충돌 처리 함수 (예: 플레이어와 적 간의 충돌)
export function handleCollision(player, enemy) {
    player.lives--;
    enemy.health--; // 적 체력 감소

    // 플레이어가 죽었는지 확인
    if (player.lives <= 0) {
        player.isAlive = false;
        // 추가적인 게임 종료 로직 (예: 게임 오버 화면 전송)
    }

    // 적이 죽었는지 확인
    if (enemy.health <= 0) {
        // 적 제거 로직 (예: 점수 증가, 애니메이션 등)
        return true; // 적이 죽음
    }

    return false; // 적이 살아 있음
}

// 총알과 적 간의 충돌 처리 함수
export function handleBulletCollision(bullet, target) {
    target.health -= bullet.damage; // 적의 체력 감소

    // 총알 제거 로직
    return target.health <= 0; // 적이 죽었는지 여부 반환
}


