// 적 AI 업데이트/총알 유틸 분리 (전역 함수로 노출)
(function(){
  const game = window;

  // 총알 생성/렌더링/스폰은 enemies.js에 위치

  game.updateKamikazeEnemy = function(enemy){
    const player = game.player;
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    enemy.x += (dx / distance) * enemy.speed;
    enemy.y += (dy / distance) * enemy.speed;
  };

  game.updateShooterIndestructibleEnemy = function(enemy){
    const player = game.player;
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    
    // stopDistance가 정의되지 않은 경우 기본값 설정
    if (enemy.stopDistance === undefined) {
      enemy.stopDistance = 150 * (game.gameScale || 1);
    }
    
    if (!enemy.hasStopped && distance > enemy.stopDistance){
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    } else if (!enemy.hasStopped) {
      enemy.hasStopped = true;
    }
    
    if (enemy.hasStopped){
      const now = Date.now();
      // shotInterval이 정의되지 않은 경우 기본값 설정
      if (enemy.shotInterval === undefined) {
        enemy.shotInterval = 2000;
      }
      if (now - (enemy.lastShot || 0) > enemy.shotInterval){
        game.spawnEnemyBullet(enemy, 'indestructible');
        enemy.lastShot = now;
      }
    }
  };

  game.updateShooterDestructibleEnemy = function(enemy){
    const player = game.player;
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    const now = Date.now();
    
    // stopDistance가 정의되지 않은 경우 기본값 설정
    if (enemy.stopDistance === undefined) {
      enemy.stopDistance = 180 * (game.gameScale || 1);
    }
    
    if (!enemy.hasStopped && distance > enemy.stopDistance){
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    } else if (!enemy.hasStopped){
      enemy.hasStopped = true;
      enemy.stopTime = now;
    }
    
    if (enemy.hasStopped){
      // shotInterval이 정의되지 않은 경우 기본값 설정
      if (enemy.shotInterval === undefined) {
        enemy.shotInterval = 1000;
      }
      if (now - (enemy.lastShot || 0) > enemy.shotInterval){
        game.spawnEnemyBullet(enemy, 'destructible');
        enemy.lastShot = now;
      }
      
      // maxStopTime이 정의되지 않은 경우 기본값 설정
      if (enemy.maxStopTime === undefined) {
        enemy.maxStopTime = 3000;
      }
      if (now - enemy.stopTime > enemy.maxStopTime){
        const canvas = document.getElementById('gameCanvas');
        const exitDx = (enemy.x < canvas.width/2) ? -1 : 1;
        const exitDy = (enemy.y < canvas.height/2) ? -1 : 1;
        enemy.x += exitDx * (2 * (game.gameScale||1));
        enemy.y += exitDy * (2 * (game.gameScale||1));
      }
    }
  };

  game.updateChaseEnemy = function(enemy){
    const player = game.player;
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    enemy.x += (dx / distance) * enemy.speed;
    enemy.y += (dy / distance) * enemy.speed;
  };

  game.updateYellowShooterEnemy = function(enemy){
    const player = game.player;
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    
    // stopDistance가 정의되지 않은 경우 기본값 설정
    if (enemy.stopDistance === undefined) {
      enemy.stopDistance = 200 * (game.gameScale || 1);
    }
    
    if (!enemy.hasStopped && distance > enemy.stopDistance){
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    } else if (!enemy.hasStopped) {
      enemy.hasStopped = true;
    }
    
    if (enemy.hasStopped){
      const now = Date.now();
      // shotInterval이 정의되지 않은 경우 기본값 설정 (5초 = 5000ms)
      if (enemy.shotInterval === undefined) {
        enemy.shotInterval = 5000;
      }
      if (now - (enemy.lastShot || 0) > enemy.shotInterval){
        game.spawnEnemyBullet(enemy, 'destructible');
        enemy.lastShot = now;
      }
    }
  };
})();


