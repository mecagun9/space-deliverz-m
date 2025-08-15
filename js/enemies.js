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

  // ===== 보스 업데이트 함수들 =====
  
  // 중순양함 보스 업데이트
  game.updateCruiserBoss = function(boss) {
    const now = Date.now();
    
    // 좌우 이동 패턴
    if (boss.movePattern === 'horizontal') {
      const centerX = game.canvas ? game.canvas.width / 2 : 384;
      const targetX = centerX + Math.sin(now * 0.001) * boss.moveRange;
      boss.x = targetX - boss.width / 2;
    }
    
    // 플레이어를 향해 천천히 하강
    if (boss.y < 100 * (game.gameScale || 1)) {
      boss.y += boss.speed;
    }
    
    // 주기적으로 총알 발사
    if (now - boss.lastShot > boss.shotInterval) {
      game.spawnBossBullet && game.spawnBossBullet(boss, 'cruiser');
      boss.lastShot = now;
    }
  };

  // 항공모함 보스 업데이트
  game.updateCarrierBoss = function(boss) {
    const now = Date.now();
    
    // 고정 위치에서 천천히 하강
    if (boss.y < 120 * (game.gameScale || 1)) {
      boss.y += boss.speed;
    }
    
    // 주기적으로 전투기 생성
    if (now - boss.lastShot > boss.shotInterval && boss.fighterSpawnCount < boss.maxFighters) {
      game.spawnFighterFromCarrier && game.spawnFighterFromCarrier(boss);
      boss.lastShot = now;
      boss.fighterSpawnCount++;
    }
  };

  // 보스 총알 생성
  game.spawnBossBullet = function(boss, bossType) {
    if (bossType === 'cruiser') {
      const gameScale = game.gameScale || 1;
      const player = game.player;
      if (!player) return;
      
      const bulletSpeed = 3 * gameScale;
      const dx = player.x + player.width/2 - (boss.x + boss.width/2);
      const dy = player.y + player.height/2 - (boss.y + boss.height/2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // 공용 총알 함수 사용
        const bullet = game.createBullet(
          boss.x + boss.width/2,
          boss.y + boss.height,
          6 * gameScale,
          6 * gameScale,
          (dx / distance) * bulletSpeed,
          (dy / distance) * bulletSpeed,
          'enemy', // 기본 적 총알 타입
          '#ff0000', // 빨간색
          2
        );
        if (bullet && game.enemyBullets) {
          game.enemyBullets.push(bullet);
        }
      }
    }
  };

  // 항공모함에서 전투기 생성
  game.spawnFighterFromCarrier = function(carrier) {
    const gameScale = game.gameScale || 1;
    const fighter = {
      x: carrier.x + Math.random() * carrier.width,
      y: carrier.y + carrier.height,
      width: 20 * gameScale,
      height: 20 * gameScale,
      speed: (Math.random() * 1 + 2) * gameScale,
      color: '#FF4500', // 주황색
      type: 'carrier_fighter',
      hp: 3,
      maxHp: 3,
      goldValue: 15 + (game.gameState ? game.gameState.stage : 1) * 3
    };
    
    if (game.enemies) {
      game.enemies.push(fighter);
    }
    if (game.playSound) {
      game.playSound(500, 0.1);
    }
  };

})();


