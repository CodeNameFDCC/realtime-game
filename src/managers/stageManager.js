
let currentStage = 1; // 현재 스테이지
let lastStageUpdateTime = 0; // 마지막 스테이지 업데이트 시간

export function getStage() {
    return currentStage;
}

export function stageReset() {
    currentStage = 1;
    lastStageUpdateTime = 0;
}

export function stageUpdate() {
    currentStage++;
    lastStageUpdateTime = Date.now();
}
