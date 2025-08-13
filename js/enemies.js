// 적 비행기(보스 포함) 생성/유틸 분리 (전역 함수로 노출)
(function(){
  const game = window;

  // 공용 총알 생성/그리기 함수는 main.js에서 제공
  // game.createBullet과 game.drawBullet은 main.js에서 정의됨

  // 적 템플릿 정의 (모양과 기본 속성)
  const ENEMY_TEMPLATES = {
    kamikaze: {
      color: '#ff3300', size: 0.9, hp: 1, goldValue: 8, speed: 1.5
    },
    shooter_indestructible: {
      color: '#cc0066', size: 1.1, hp: 2, goldValue: 15, speed: 1.2, shotInterval: 2000, stopDistance: 150
    },
    shooter_destructible: {
      color: '#9933ff', size: 1.0, hp: 1, goldValue: 12, speed: 1.3, shotInterval: 100, stopDistance: 180, maxStopTime: 3000
    },
    chase: {
      color: '#ff00ff', size: 0.8, hp: 1, goldValue: 8, speed: 2.0
    },
    strong: {
      color: '#ff0000', size: 1.2, hp: 2, goldValue: 12, speed: 0.8
    },
    yellow_shooter: {
      color: '#FFD93D', size: 1.0, hp: 2, goldValue: 10, speed: 1.2, shotInterval: 5000, stopDistance: 200
    }
  };

  game.spawnBoss = function() {
    if (game.gameState.stage === 2) {
      game.spawnCruiserBoss();
    } else if (game.gameState.stage >= 3) {
      game.spawnCarrierBoss();
    }
  };

  game.spawnCruiserBoss = function() {
    const canvas = document.getElementById('gameCanvas');
    const gameScale = game.gameScale || 1;
    const boss = {
      x: canvas.width / 2 - 60 * gameScale,
      y: -80 * gameScale,
      width: 120 * gameScale,
      height: 60 * gameScale,
      speed: 0.5 * gameScale,
      color: '#8B0000',
      type: 'cruiser_boss',
      hp: 50 + game.gameState.stage * 10,
      maxHp: 50 + game.gameState.stage * 10,
      goldValue: 100 + game.gameState.stage * 20,
      lastShot: 0,
      shotInterval: 2000,
      phase: 1,
      movePattern: 'horizontal',
      moveDirection: 1,
      moveRange: 200 * gameScale
    };
    game.enemies.push(boss);
    game.gameState.currentBoss = boss;
    game.playSound && game.playSound(200, 0.3);
  };

  game.spawnCarrierBoss = function() {
    const canvas = document.getElementById('gameCanvas');
    const gameScale = game.gameScale || 1;
    const boss = {
      x: canvas.width / 2 - 80 * gameScale,
      y: -100 * gameScale,
      width: 160 * gameScale,
      height: 80 * gameScale,
      speed: 0.3 * gameScale,
      color: '#4B0082',
      type: 'carrier_boss',
      hp: 80 + game.gameState.stage * 15,
      maxHp: 80 + game.gameState.stage * 15,
      goldValue: 150 + game.gameState.stage * 25,
      lastShot: 0,
      shotInterval: 1500,
      phase: 1,
      movePattern: 'stationary',
      fighterSpawnCount: 0,
      maxFighters: 5 + game.gameState.stage * 2
    };
    game.enemies.push(boss);
    game.gameState.currentBoss = boss;
    game.playSound && game.playSound(150, 0.4);
  };

  // 템플릿 기반 적 생성 함수
  game.createEnemyFromTemplate = function(templateName, x, y, baseSize, baseSpeed, destination, gameState, gameScale) {
    const template = ENEMY_TEMPLATES[templateName];
    if (!template) {
      console.error('Unknown enemy template:', templateName);
      return null;
    }

    // AI 함수명 생성 (언더스코어 처리)
    let aiFunctionName = 'update';
    const parts = templateName.split('_');
    parts.forEach(part => {
      aiFunctionName += part.charAt(0).toUpperCase() + part.slice(1);
    });
    aiFunctionName += 'Enemy';

    const enemy = {
      x: x, y: y, width: baseSize * template.size, height: baseSize * template.size,
      color: template.color, type: templateName, hp: template.hp, maxHp: template.hp,
      goldValue: template.goldValue + gameState.stage,
      speed: (Math.random() * 0.5 + template.speed) * baseSpeed * destination.difficulty * 0.5,
      ai: game[aiFunctionName] || game.updateChaseEnemy  // 여기가 수정된 부분
    };

    // 특별한 속성들 추가
    if (template.shotInterval) { enemy.shotInterval = template.shotInterval; enemy.lastShot = 0; }
    if (template.stopDistance) { enemy.stopDistance = template.stopDistance * gameScale; enemy.hasStopped = false; }
    if (template.maxStopTime) { enemy.maxStopTime = template.maxStopTime; enemy.stopTime = 0; enemy.exitSpeed = 2 * baseSpeed; }

    enemy.lastUpdate = Date.now();
    return enemy;
  };

})();


