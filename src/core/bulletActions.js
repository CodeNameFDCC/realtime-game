// bulletActions.js
const bullets = new Set(); // 총알을 관리할 Set 초기화

export function initializeBulletActions(io, socket) {
    // 총알 발사 이벤트 처리
    socket.on('newBullet', (bulletData) => {
        const bullet = {
            id: bulletData.id,
            x: bulletData.x,
            y: bulletData.y,
            type: bulletData.type,
            damage: bulletData.damage
        };
        bullets.add(bullet); // bullets Set에 추가
        console.log("총알 추가");

        // 모든 클라이언트에 총알 정보 전송
        io.emit('newBullet', bullet);
    });
}

// bullets를 다른 모듈에서 사용할 수 있도록 export
export { bullets };
