// 편대 패턴 정의 및 스폰/틱 유틸
(function(){
  const game = window;

  const formations = [
    { name: 'vee_small', ai: 'chase', speedMul: 1.0, nodes: [
      { x: 0.50, y: -0.10, color: '#ff00ff' },
      { x: 0.45, y: -0.15, color: '#ff00ff' },
      { x: 0.55, y: -0.15, color: '#ff00ff' },
      { x: 0.40, y: -0.20, color: '#ff0000' },
      { x: 0.60, y: -0.20, color: '#ff0000' },
    ]},
    { name: 'line_left_to_right', ai: 'shooter_destructible', speedMul: 0.9, path: 'horizontal', nodes: [
      { x: -0.10, y: 0.20, color: '#9933ff' },
      { x: -0.10, y: 0.25, color: '#9933ff' },
      { x: -0.10, y: 0.30, color: '#9933ff' },
      { x: -0.10, y: 0.35, color: '#9933ff' },
      { x: -0.10, y: 0.40, color: '#9933ff' },
    ]},
    { name: 'down_wave', ai: 'shooter_indestructible', speedMul: 0.8, path: 'down_wave', nodes: [
      { x: 0.30, y: -0.10, color: '#cc0066' },
      { x: 0.40, y: -0.15, color: '#cc0066' },
      { x: 0.50, y: -0.20, color: '#cc0066' },
      { x: 0.60, y: -0.15, color: '#cc0066' },
      { x: 0.70, y: -0.10, color: '#cc0066' },
    ]},
    { name: 'column_down', ai: 'chase', speedMul: 1.0, path: 'down', nodes: [
      { x: 0.20, y: -0.10, color: '#ff0000' },
      { x: 0.20, y: -0.18, color: '#ff0000' },
      { x: 0.20, y: -0.26, color: '#ff0000' },
      { x: 0.20, y: -0.34, color: '#ff0000' },
    ]},
    { name: 'zigzag', ai: 'chase', speedMul: 1.1, path: 'zigzag', nodes: [
      { x: 0.0, y: 0.10, color: '#ff00ff' },
      { x: 0.1, y: 0.05, color: '#ff00ff' },
      { x: 0.2, y: 0.10, color: '#ff00ff' },
      { x: 0.3, y: 0.05, color: '#ff00ff' },
      { x: 0.4, y: 0.10, color: '#ff00ff' },
    ]},
    { name: 'arc_down', ai: 'shooter_destructible', speedMul: 0.9, path: 'arc_down', nodes: [
      { x: 0.30, y: -0.05, color: '#9933ff' },
      { x: 0.40, y: -0.10, color: '#9933ff' },
      { x: 0.50, y: -0.15, color: '#9933ff' },
      { x: 0.60, y: -0.10, color: '#9933ff' },
      { x: 0.70, y: -0.05, color: '#9933ff' },
    ]},
  ];

  function toCanvas(xRatio, yRatio) {
    const canvas = document.getElementById('gameCanvas');
    return { x: canvas.width * xRatio, y: canvas.height * yRatio };
  }

  function spawnFormation(form, opts = {}) {
    const scale = game.gameScale || 1;
    const destination = game.DESTINATIONS?.[game.gameState?.selectedDestination];
    const diff = destination?.difficulty || 1;

    const def = typeof form === 'number' ? formations[form] : formations.find(f => f.name === form) || form;
    if (!def) return;

    const speedMul = (def.speedMul ?? 1) * (opts.speedMul ?? 1);
    def.nodes.forEach(n => {
      const p = toCanvas(n.x, n.y);
      const baseSize = 25 * scale;
      const baseSpeed = scale * diff * 0.5 * speedMul;
      const color = n.color || '#ff00ff';

      const enemy = {
        x: p.x, y: p.y, width: baseSize, height: baseSize,
        speed: baseSpeed, color,
        hp: 1, maxHp: 1, goldValue: 8 + (game.gameState?.stage || 1),
        type: 'formation',
        path: def.path || null,
        vx: 0, vy: 0,
      };

      // 경로 초기 속도
      if (def.path === 'horizontal') {
        enemy.vx = 2 * scale * speedMul;
        enemy.vy = 0;
      } else if (def.path === 'down') {
        enemy.vx = 0;
        enemy.vy = 1.5 * scale * speedMul;
      } else if (def.path === 'down_wave') {
        enemy.vx = 0;
        enemy.vy = 1.2 * scale * speedMul;
        enemy.waveT = 0;
      } else if (def.path === 'zigzag') {
        enemy.vx = 1.8 * scale * speedMul;
        enemy.vy = 0.6 * scale * speedMul;
        enemy.zigDir = 1;
      } else if (def.path === 'arc_down') {
        enemy.vx = 0;
        enemy.vy = 1.0 * scale * speedMul;
        enemy.arcT = 0;
      }

      game.enemies.push(enemy);
    });
  }

  function tickFormationMovement(enemy, dt = 16) {
    // 간단한 경로 업데이트(프레임 기반)
    if (!enemy.path) return;
    const scale = game.gameScale || 1;
    if (enemy.path === 'horizontal') {
      enemy.x += enemy.vx;
    } else if (enemy.path === 'down') {
      enemy.y += enemy.vy;
    } else if (enemy.path === 'down_wave') {
      enemy.y += enemy.vy;
      enemy.waveT = (enemy.waveT || 0) + dt * 0.005;
      enemy.x += Math.sin(enemy.waveT) * 1.5 * scale;
    } else if (enemy.path === 'zigzag') {
      enemy.x += enemy.vx * (enemy.zigDir || 1);
      enemy.y += enemy.vy;
      if (Math.random() < 0.02) enemy.zigDir = - (enemy.zigDir || 1);
    } else if (enemy.path === 'arc_down') {
      enemy.y += enemy.vy;
      enemy.arcT = (enemy.arcT || 0) + dt * 0.004;
      enemy.x += Math.cos(enemy.arcT) * 1.2 * scale;
    }
  }

  game.FORMATIONS = formations;
  game.spawnFormation = spawnFormation;
  game.tickFormationMovement = tickFormationMovement;
})();


