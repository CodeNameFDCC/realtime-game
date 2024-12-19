let currentStage = 1; // 현재 스테이지
let lastStageUpdateTime = 0; // 마지막 스테이지 업데이트 시간
let stageUpdateIntervalId; // 스테이지 업데이트 ID

// 스테이지를 주기적으로 업데이트 할 주기 (밀리초)
const stageUpdateInterval = 10000; // 10초

export function getStage() {
    return currentStage;
}

export function stageReset() {
    currentStage = 1;
    lastStageUpdateTime = 0;
}

// 스테이지 업데이트 함수
export function stageUpdate() {
    currentStage++;
    lastStageUpdateTime = Date.now();
}

// 점수 추가 함수
export function addScore(stage) {
    if (stage <= 1) return 100;
    else if (stage === 2) return 200;
    else if (stage === 3) return 300;
    else if (stage === 4) return 400;
    else return 500;
}

// 스테이지 업데이트를 시작하는 함수
export function startStageUpdate() {
    // 이미 타이머가 설정된 경우 아무 작업도 하지 않음
    if (stageUpdateIntervalId) return;

    stageUpdateIntervalId = setInterval(() => {
        stageUpdate(); // 스테이지를 1 증가시킴
        console.log(`현재 스테이지: ${currentStage}`); // 현재 스테이지 출력
    }, stageUpdateInterval);
}

// 스테이지 업데이트 중지 함수
export function stopStageUpdate() {
    if (stageUpdateIntervalId) {
        clearInterval(stageUpdateIntervalId); // 타이머 중지
        stageReset();
        stageUpdateIntervalId = null; // ID 초기화
    }
}
