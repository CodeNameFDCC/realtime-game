// enemyActions.js

const enemies = new Set(); // 적을 관리할 Set 초기화

export function initializeEnemyActions(io, socket, gameStatus) {
    // 적 생성 및 업데이트 주기 설정
    setInterval(() => {
        if (gameStatus.state !== 'playing') return; // 게임이 진행 중일 때만 실행

        // 적 생성 로직
        spawnEnemy();

        // 적 업데이트 로직
        updateEnemies(io);
    }, 1000); // 매초 업데이트
}

// 적 생성 함수
function spawnEnemy() {
    if (Math.random() < 0.02) { // 2% 확률로 적 생성
        enemies.add({
            id: Date.now(),
            x: Math.random() * 800, // 게임 너비 내에서 랜덤 위치
            y: -30, // 화면 위에서 시작
            health: 2 // 기본 체력
        });
    }
}

// 적 업데이트 함수
function updateEnemies(io) {
    for (const enemy of Array.from(enemies)) { // Set을 배열로 변환하여 순회
        enemy.y += 2; // 적의 이동 속도

        // 적이 화면 밖으로 나갔을 때 제거
        if (enemy.y > 600) { // 게임 높이
            enemies.delete(enemy);
            continue;
        }

        // 적이 공격하는 로직 (예: 총알 발사)
        if (Math.random() < 0.01) { // 1% 확률로 공격
            fireEnemyBullet(enemy, io);
        }
    }

    // 모든 클라이언트에 적 상태 전송
    io.emit('updateEnemies', Array.from(enemies));
}

// 적의 총알 발사 함수
function fireEnemyBullet(enemy, io) {
    const bullet = {
        id: Date.now(),
        x: enemy.x,
        y: enemy.y,
        type: 'enemy',
        damage: 1
    };

    // 총알을 클라이언트에 전송
    io.emit('newBullet', bullet);
}
