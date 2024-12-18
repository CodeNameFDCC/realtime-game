

// 게임 상태 초기화 함수
export function resetGameStates(players) {
    players.forEach(player => {
        player.lives = 3;
        player.score = 0;
        player.powerLevel = 1;
        player.bombs = 2;
        player.isAlive = true;
        player.x = 400; // 중앙 위치
        player.y = 550; // 하단 위치
    });
}

// 랜덤 값 생성 함수
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 객체 복사 함수
export function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 배열에서 랜덤 요소 선택 함수
export function getRandomElement(arr) {
    return arr[getRandomInt(0, arr.length - 1)];
}

// 기타 유틸리티 함수 추가 가능
