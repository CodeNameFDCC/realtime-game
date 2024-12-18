// playerActions.js
import { bullets } from './bulletActions.js'; // bullets 가져오기

export function initializePlayerActions(io, socket, players, gameStates, gameStatus) {
    // 플레이어가 게임에 참여할 때
    socket.on('joinGame', (playerName) => {
        if (gameStatus.state === gameStates.WAITING) {
            gameStatus.state = gameStates.PLAYING;
        }


        players.set(socket.id, {
            id: socket.id,
            name: playerName,
            x: 400, // 중앙 위치
            y: 550, // 하단 위치
            lives: 3,
            score: 0,
            powerLevel: 1,
            bombs: 0,
            isAlive: true
        });

        console.log('Player joined:', playerName); // 여기서 로그 출력
        console.log('Game state changed to:', gameStatus.state);
        io.emit('updatePlayers', Array.from(players.values()));
        io.emit('gameStateChange', gameStatus.state);
    });

    // 플레이어 이동 처리
    socket.on('playerMove', (position) => {
        const player = players.get(socket.id);
        if (player && player.isAlive) {
            player.x = position.x;
            player.y = position.y;
            io.emit('updatePlayers', Array.from(players.values()));
        }
    });

    // 플레이어가 총을 쏠 때
    socket.on('playerShoot', (bulletData) => {
        // 총알 데이터 생성
        const bullet = {
            id: Date.now(),
            x: bulletData.x,
            y: bulletData.y,
            playerId: socket.id,
            type: 'player',
            damage: player.powerLevel
        };

        bullets.add(bullet); // bullets에 추가
        io.emit('newBullet', bullet); // 모든 클라이언트에 전송
    });

    // 폭탄 사용 시
    socket.on('useBomb', () => {
        const player = players.get(socket.id);
        if (player && player.isAlive && player.bombs > 0) {
            player.bombs--;
            // 폭탄 사용 로직 (적 처치 등)
            io.emit('bombUsed', socket.id);
            io.emit('updatePlayers', Array.from(players.values()));
        }
    });

    // 게임 재시작 시
    socket.on('restartGame', () => {
        const player = players.get(socket.id);
        if (player) {
            player.lives = 3;
            player.score = 0;
            player.powerLevel = 1;
            player.bombs = 2;
            player.isAlive = true;
            player.x = 400; // 중앙 위치
            player.y = 550; // 하단 위치

            io.emit('updatePlayers', Array.from(players.values()));

            if (gameStatus.state === gameStates.GAME_OVER) {
                gameStatus.state = gameStates.PLAYING;
                io.emit('gameStateChange', gameStatus.state);
            }
        }
    });

    // 플레이어가 연결을 끊을 때
    socket.on('disconnect', () => {
        players.delete(socket.id);
        io.emit('updatePlayers', Array.from(players.values()));

        if (players.size === 0) {
            gameStatus.state = gameStates.WAITING;
            io.emit('gameStateChange', gameStatus.state);
        }
    });
}
