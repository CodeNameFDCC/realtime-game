import app from "../routes/auth.js";

// 현재 점수를 저장할 객체
let currentScore = {};
// 플레이어 정보를 저장할 객체
let players = {};

// 플레이어 추가 함수
export function addPlayer(id, name) {
    if (!players[id]) {
        players[id] = { id, name }; // 플레이어 정보를 저장
    }
}

// 점수 업데이트 함수
export function updateScore(id, stage, score) {
    // 플레이어가 존재하지 않으면 추가
    if (!players[id]) {
        players[id] = { id, name: 'Unknown' }; // 기본 이름 설정
    }

    // id가 없는 경우 새 객체 생성
    if (!currentScore[id]) {
        currentScore[id] = {}; // id에 대한 점수 객체 생성
    }

    // stage가 없는 경우 초기화
    if (!currentScore[id][stage]) {
        currentScore[id][stage] = 0; // 초기 점수 설정 (0으로 초기화)
    }

    // 점수 업데이트
    currentScore[id][stage] += score; // 해당 스테이지 점수 업데이트
}

// 점수 조회 함수
export function getScore(id, stage) {
    if (currentScore[id] && currentScore[id][stage] !== undefined) {
        return currentScore[id][stage]; // 해당 스테이지 점수 반환
    } else {
        return null; // 점수가 존재하지 않음
    }
}

// 총 점수 반환 함수
export function getTotalScore(id) {
    if (currentScore[id]) {
        // 모든 스테이지 점수를 합산
        return Object.values(currentScore[id]).reduce((total, score) => total + score, 0);
    } else {
        return 0; // 해당 id의 점수가 존재하지 않으면 0 반환
    }
}

// 점수 API 엔드포인트
app.get("/scores", (req, res) => {
    // 점수와 플레이어 정보를 결합하여 새로운 배열 생성
    const scoresWithNames = Object.keys(currentScore).map(id => {
        return {
            id,
            name: players[id] ? players[id].name : 'Unknown',
            totalScore: getTotalScore(id)
        };
    });

    // 점수에 따라 플레이어 정렬
    const sortedPlayers = scoresWithNames.sort((a, b) => b.totalScore - a.totalScore);

    // 상위 10명 선택
    const topPlayers = sortedPlayers.slice(0, 10);
    console.log(topPlayers);
    res.json(topPlayers);
});
