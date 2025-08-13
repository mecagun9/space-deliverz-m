// 총알 관련 모든 함수들을 한 곳에 모음
(function(){
  const game = window;

  // ===== 총알 생성 함수 =====
  game.createBullet = function(x, y, width, height, vx, vy, type, color, damage = 1) {
    return {
      x: x,
      y: y,
      width: width,
      height: height,
      vx: vx,
      vy: vy,
      type: type,
      color: color,
      damage: damage,
      lastUpdate: Date.now() // 필수 속성 추가
    };
  };

  // ===== 적 총알 생성 함수 =====
  game.spawnEnemyBullet = function(enemy, bulletType) {
    const gameScale = game.gameScale || 1;
    const bulletSize = 4 * gameScale * 5; // 적 총알 크기 5배
    const bulletSpeed = 3 * gameScale;
    const player = game.player;
    
    if (!player) return; // 플레이어가 없으면 생성하지 않음
    
    // 플레이어 방향으로 총알 발사
    const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
    const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy) || 1;
    
    const vx = (dx / distance) * bulletSpeed;
    const vy = (dy / distance) * bulletSpeed;
    
    const bullet = game.createBullet(
      enemy.x + enemy.width/2 - bulletSize/2,
      enemy.y + enemy.height/2 - bulletSize/2,
      bulletSize, bulletSize, vx, vy, bulletType, enemy.color
    );
    
    // 전역 배열에 추가
    if (game.enemyBullets && Array.isArray(game.enemyBullets)) {
      game.enemyBullets.push(bullet);
    }
    
    // 사운드 재생
    if (game.playSound) {
      game.playSound(300, 0.1);
    }
    
    return bullet;
  };

  // ===== 총알 그리기 함수 =====
  game.drawBullet = function(bullet, ctx) {
    if (!bullet || !ctx) return;
    
    switch(bullet.type) {
      case 'indestructible':
        // 부술 수 없는 총알: 붉은 외곽 + 노란 내부 + 특별한 효과
        const outerColor = '#8B0000'; // 매우 붉은색
        const innerColor = '#FFFF00'; // 노란색
        const cx = bullet.x + bullet.width / 2;
        const cy = bullet.y + bullet.height / 2;
        const rOuter = Math.max(1, bullet.width / 2);
        const rInner = Math.max(0.5, bullet.width / 3);

        // 외곽 원
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
        ctx.fill();

        // 내부 원
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
        ctx.fill();

        // 부술 수 없음을 나타내는 X 표시
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - rInner * 0.7, cy - rInner * 0.7);
        ctx.lineTo(cx + rInner * 0.7, cy + rInner * 0.7);
        ctx.moveTo(cx + rInner * 0.7, cy - rInner * 0.7);
        ctx.lineTo(cx - rInner * 0.7, cy + rInner * 0.7);
        ctx.stroke();
        break;
        
      case 'destructible':
        // 부술 수 있는 총알: 적의 색깔과 동일
        ctx.fillStyle = bullet.color || '#9933ff';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        break;
        
      case 'player':
        // 플레이어 총알: 노란색
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        break;
        
      case 'turret':
        // 포탑 총알: 초록색
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        break;
        
      case 'enemy':
        // 적 총알: 빨간색
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        break;
        
      default:
        // 기본 총알: 빨간색
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  };

  // ===== 총알 업데이트 함수 =====
  game.updateAllBullets = function() {
    const now = Date.now();
    
    // 적 총알 업데이트
    if (game.enemyBullets && Array.isArray(game.enemyBullets)) {
      game.enemyBullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 화면 밖으로 나간 총알 제거
        if (bullet.y > 1200 || bullet.y < -50 || bullet.x > 800 || bullet.x < -50) {
          game.enemyBullets.splice(index, 1);
        }
      });
    }
    
    // 플레이어 총알 업데이트
    if (game.bullets && Array.isArray(game.bullets)) {
      game.bullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 화면 밖으로 나간 총알 제거
        if (bullet.y < -50) {
          game.bullets.splice(index, 1);
        }
      });
    }
    
    // 포탑 총알 업데이트
    if (game.turretBullets && Array.isArray(game.turretBullets)) {
      game.turretBullets.forEach((bullet, index) => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 화면 밖으로 나간 총알 제거
        if (bullet.y < -50) {
          game.turretBullets.splice(index, 1);
        }
      });
    }
  };

  // ===== 총알 그리기 함수들 =====
  game.drawAllBullets = function(ctx) {
    if (!ctx) return;
    
    // 디버깅: 총알 배열 상태 확인
    console.log('Drawing bullets:', {
      enemyBullets: game.enemyBullets?.length || 0,
      playerBullets: game.bullets?.length || 0,
      turretBullets: game.turretBullets?.length || 0
    });
    
    // 적 총알 그리기
    if (game.enemyBullets && Array.isArray(game.enemyBullets)) {
      game.enemyBullets.forEach(bullet => {
        game.drawBullet(bullet, ctx);
      });
    }
    
    // 플레이어 총알 그리기
    if (game.bullets && Array.isArray(game.bullets)) {
      game.bullets.forEach(bullet => {
        if (!bullet.type) bullet.type = 'player';
        console.log('Drawing player bullet:', bullet);
        game.drawBullet(bullet, ctx);
      });
    }
    
    // 포탑 총알 그리기
    if (game.turretBullets && Array.isArray(game.turretBullets)) {
      game.turretBullets.forEach(bullet => {
        if (!bullet.type) bullet.type = 'turret';
        game.drawBullet(bullet, ctx);
      });
    }
  };

})();
