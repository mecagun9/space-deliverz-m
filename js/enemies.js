// 적 비행기(보스 포함) 생성/유틸 분리 (전역 함수로 노출)
(function(){
  const game = window;

  // 공용 총알 생성/그리기 함수는 main.js에서 제공
  // game.createBullet과 game.drawBullet은 main.js에서 정의됨

  // 적 총알 스폰(부술 수 있는/없는 타입 포함)
  game.spawnEnemyBullet = function(enemy, bulletType){
    const gameScale = game.gameScale || 1;
    // 적 총알 크기 5배 확대
    const bulletSize = 4 * gameScale * 5;
    const bulletSpeed = 3 * gameScale;
    const player = game.player;

    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;

    const vx = (dx / distance) * bulletSpeed;
    const vy = (dy / distance) * bulletSpeed;

    const bullet = game.createBullet(
      enemy.x + enemy.width/2 - bulletSize/2,
      enemy.y + enemy.height/2 - bulletSize/2,
      bulletSize,
      bulletSize,
      vx,
      vy,
      bulletType,
      enemy.color
    );
    
    // 총알에 필수 속성 추가
    bullet.lastUpdate = Date.now();
    
    // main.js의 enemyBullets 배열에 직접 추가
    if (game.enemyBullets && Array.isArray(game.enemyBullets)) {
      game.enemyBullets.push(bullet);
    }
    game.playSound && game.playSound(300, 0.1);
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

})();


