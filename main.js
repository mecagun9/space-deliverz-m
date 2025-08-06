(() => {
    "use strict";

    // ===== 게임 데이터 정의 =====
    const DESTINATIONS = {
        nearby: { 
            name: '🌍 근거리 행성', 
            description: '안전하지만 보상이 적습니다.',
            time: 120, 
            difficulty: 1, 
            goldMultiplier: 1, 
            diamondMultiplier: 1,
            details: '⭐ 위험도: 낮음 | 적 속도: 보통 | 적 체력: 1'
        },
        medium: { 
            name: '🪐 중거리 행성',
            description: '적당한 위험과 보상입니다.',
            time: 150, 
            difficulty: 1.5, 
            goldMultiplier: 1.2, 
            diamondMultiplier: 1.2,
            details: '⭐⭐ 위험도: 중간 | 적 속도: 빠름 | 적 체력: 1-2'
        },
        far: { 
            name: '🌌 원거리 행성',
            description: '위험하지만 보상이 좋습니다.',
            time: 180, 
            difficulty: 2, 
            goldMultiplier: 1.5, 
            diamondMultiplier: 1.5,
            details: '⭐⭐⭐ 위험도: 높음 | 적 속도: 매우 빠름 | 적 체력: 2-3'
        },
        dangerous: { 
            name: '⚠️ 위험 지역',
            description: '매우 위험하지만 최고의 보상!',
            time: 210, 
            difficulty: 3, 
            goldMultiplier: 2, 
            diamondMultiplier: 2,
            details: '⭐⭐⭐⭐ 위험도: 매우 높음 | 적 속도: 극한 | 적 체력: 3-5'
        }
    };

    const CARGO_TYPES = {
        military: { name: '군사 물자', damageBonus: 0.5, enemySpawnRate: 1.3, reward: 15 },
        medical: { name: '의료 용품', bonusLife: 1, speedPenalty: 0.1, reward: 10 },
        energy: { name: '에너지 셀', fireRateBonus: 0.3, reward: 12 },
        luxury: { name: '고급품', diamondBonus: 1, speedPenalty: 0.2, reward: 25 },
        tech: { name: '기술 부품', turretAccuracy: 0.25, reward: 18 },
        fuel: { name: '연료', speedBonus: 0.2, reward: 8 },
        food: { name: '식량', effects: {}, reward: 20, goldReward: true },
        art: { name: '예술품', effects: {}, reward: 15, diamondReward: true }
    };

    // ===== 게임 상태 변수들 =====
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let gameScale = 1;
    let touchTarget = { x: 0, y: 0, active: false };
    let autoShootTimer = 0;

    let gameState = {
        score: 0, gold: 100, diamonds: 0, lives: 3, stage: 1, inGame: false, gameOver: false,
        stageComplete: false, stageTimer: 120, lastTimerUpdate: 0, keys: {}, lastEnemySpawn: 0,
        damageLevel: 1, speedLevel: 1, turretCount: 1, shipSpeedLevel: 1, maxTurretLevel: 1,
        cargoCapacityLevel: 1, fireRateLevel: 1, selectedDestination: null, selectedCargos: []
    };

    const player = {
        x: 400, y: 500, width: 40, height: 40, speed: 4, color: '#00ffff', turrets: []
    };

    let bullets = [], turretBullets = [], enemies = [], explosions = [], stars = [], gameLoopRunning = false;
    let enemyBullets = [], miniFighters = [];
    let audioContext;

    // ===== 기본 함수들 =====
    function initAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('오디오 초기화 실패:', e);
        }
    }

    function playSound(frequency, duration) {
        if (!audioContext) return;
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('사운드 재생 실패:', e);
        }
    }

    function resizeCanvas() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (isMobile) {
            canvasWidth = Math.min(windowWidth - 20, 700);
            canvasHeight = Math.min(windowHeight - 200, 500);
        } else {
            canvasWidth = Math.min(windowWidth - 40, 800);
            canvasHeight = Math.min(windowHeight - 300, 600);
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        gameScale = canvasWidth / 800;
        
        player.width = 40 * gameScale;
        player.height = 40 * gameScale;
        player.speed = 4 * gameScale;
        
        player.x = canvasWidth / 2 - player.width / 2;
        player.y = canvasHeight - player.height - 50;
    }

    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // ===== 영구 업그레이드 함수들 =====
    function getMaxCargoSlots() { return 2 + (gameState.cargoCapacityLevel - 1); }
    function getMaxTurretCount() { return 3 + (gameState.maxTurretLevel - 1) * 2; }
    function getShipSpeedBonus() { return (gameState.shipSpeedLevel - 1) * 15; }
    function getFireRateBonus() { return (gameState.fireRateLevel - 1) * 20; }

    function upgradeShipSpeed() {
        const cost = 5 + (gameState.shipSpeedLevel - 1) * 3;
        if (gameState.diamonds >= cost) {
            gameState.diamonds -= cost;
            gameState.shipSpeedLevel++;
            playSound(600, 0.3);
            updatePrepUI();
        }
    }

    function upgradeMaxTurrets() {
        const cost = 8 + (gameState.maxTurretLevel - 1) * 5;
        if (gameState.diamonds >= cost) {
            gameState.diamonds -= cost;
            gameState.maxTurretLevel++;
            playSound(600, 0.3);
            updatePrepUI();
        }
    }

    function upgradeCargoCapacity() {
        const cost = 10 + (gameState.cargoCapacityLevel - 1) * 7;
        if (gameState.diamonds >= cost) {
            gameState.diamonds -= cost;
            gameState.cargoCapacityLevel++;
            playSound(600, 0.3);
            updatePrepUI();
            updateCargoSlotDisplay();
        }
    }

    function upgradeFireRate() {
        const cost = 6 + (gameState.fireRateLevel - 1) * 4;
        if (gameState.diamonds >= cost) {
            gameState.diamonds -= cost;
            gameState.fireRateLevel++;
            playSound(600, 0.3);
            updatePrepUI();
        }
    }

    // ===== UI 관련 함수들 =====
    function selectDestination(destKey) {
        gameState.selectedDestination = destKey;
        document.querySelectorAll('[data-destination]').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector('[data-destination="' + destKey + '"]').classList.add('selected');
        
        const dest = DESTINATIONS[destKey];
        document.getElementById('destinationInfo').style.display = 'block';
        document.getElementById('selectedDestName').textContent = dest.name;
        document.getElementById('selectedDestDesc').textContent = dest.description;
        document.getElementById('selectedDestDetails').textContent = dest.details;
        
        updateStartButton();
    }

    function selectCargo(cargoKey) {
        const maxSlots = getMaxCargoSlots();
        const currentIndex = gameState.selectedCargos.indexOf(cargoKey);
        
        if (currentIndex !== -1) {
            gameState.selectedCargos.splice(currentIndex, 1);
            document.querySelector('[data-cargo="' + cargoKey + '"]').classList.remove('selected');
        } else {
            if (gameState.selectedCargos.length < maxSlots) {
                gameState.selectedCargos.push(cargoKey);
                document.querySelector('[data-cargo="' + cargoKey + '"]').classList.add('selected');
            }
        }
        
        document.getElementById('selectedCargoCount').textContent = gameState.selectedCargos.length;
        updateStartButton();
    }

    function updateStartButton() {
        const canStart = gameState.selectedDestination && gameState.selectedCargos.length > 0;
        const startBtn = document.getElementById('startBtn');
        startBtn.disabled = !canStart;
        
        if (canStart) {
            startBtn.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
        } else {
            startBtn.style.boxShadow = 'none';
        }
    }

    function updatePrepUI() {
        document.getElementById('prepGold').textContent = gameState.gold;
        document.getElementById('prepDiamonds').textContent = gameState.diamonds;
        document.getElementById('shipSpeedLevel').textContent = gameState.shipSpeedLevel;
        document.getElementById('speedBonus').textContent = getShipSpeedBonus();
        document.getElementById('maxTurretLevel').textContent = gameState.maxTurretLevel;
        document.getElementById('maxTurrets').textContent = getMaxTurretCount();
        document.getElementById('cargoCapacityLevel').textContent = gameState.cargoCapacityLevel;
        document.getElementById('cargoSlotBonus').textContent = getMaxCargoSlots() - 2;
        document.getElementById('fireRateLevel').textContent = gameState.fireRateLevel;
        document.getElementById('fireRateBonus').textContent = getFireRateBonus();
        
        const speedCost = 5 + (gameState.shipSpeedLevel - 1) * 3;
        const turretCost = 8 + (gameState.maxTurretLevel - 1) * 5;
        const cargoCost = 10 + (gameState.cargoCapacityLevel - 1) * 7;
        const fireRateCost = 6 + (gameState.fireRateLevel - 1) * 4;
        
        document.getElementById('speedUpgradeCost').textContent = speedCost;
        document.getElementById('turretUpgradeCost').textContent = turretCost;
        document.getElementById('cargoUpgradeCost').textContent = cargoCost;
        document.getElementById('fireRateUpgradeCost').textContent = fireRateCost;
        
        document.querySelector('[onclick="upgradeShipSpeed()"]').disabled = gameState.diamonds < speedCost;
        document.querySelector('[onclick="upgradeMaxTurrets()"]').disabled = gameState.diamonds < turretCost;
        document.querySelector('[onclick="upgradeCargoCapacity()"]').disabled = gameState.diamonds < cargoCost;
        document.querySelector('[onclick="upgradeFireRate()"]').disabled = gameState.diamonds < fireRateCost;
    }

    function updateCargoSlotDisplay() {
        const maxSlots = getMaxCargoSlots();
        document.getElementById('selectedCargoCount').textContent = gameState.selectedCargos.length;
        document.getElementById('maxCargoSlots').textContent = maxSlots;
        document.getElementById('maxCargoDisplay').textContent = maxSlots;
    }

    function updateUI() {
        document.getElementById('score').textContent = gameState.score;
        document.getElementById('gold').textContent = gameState.gold;
        document.getElementById('lives').textContent = gameState.lives;
        document.getElementById('timer').textContent = gameState.stageTimer;
        document.getElementById('turretCount').textContent = player.turrets.length;
        
        const damageCost = 50 + (gameState.damageLevel - 1) * 25;
        const speedCost = 75 + (gameState.speedLevel - 1) * 25;
        const turretCost = 100;
        const maxTurrets = getMaxTurretCount();
        
        document.getElementById('damageCost').textContent = damageCost + '골드';
        document.getElementById('speedCost').textContent = speedCost + '골드';
        document.getElementById('turretCost').textContent = turretCost + '골드';
        
        document.querySelector('[onclick="upgradeDamage()"]').disabled = gameState.gold < damageCost;
        document.querySelector('[onclick="upgradeSpeed()"]').disabled = gameState.gold < speedCost;
        document.querySelector('[onclick="addTurret()"]').disabled = gameState.gold < turretCost || player.turrets.length >= maxTurrets;
    }

    // ===== 게임 로직 함수들 =====
    function startGame() {
        if (!gameState.selectedDestination || gameState.selectedCargos.length === 0) {
            alert('목적지와 화물을 선택해주세요!');
            return;
        }
        
        if (!audioContext) initAudio();
        resizeCanvas();
        initializeGame();
        
        document.getElementById('prepScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        
        gameState.inGame = true;
        gameState.gameOver = false;
        gameState.stageComplete = false;
        gameState.lastTimerUpdate = Date.now();
        
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            gameLoop();
        }
    }

    function initializeGame() {
        const destination = DESTINATIONS[gameState.selectedDestination];
        gameState.stageTimer = destination.time;
        
        let speedMultiplier = 1, damageMultiplier = 1, bonusLives = 0, fireRateMultiplier = 1;
        
        gameState.selectedCargos.forEach(cargoKey => {
            const cargo = CARGO_TYPES[cargoKey];
            if (cargo.speedPenalty) speedMultiplier -= cargo.speedPenalty;
            if (cargo.speedBonus) speedMultiplier += cargo.speedBonus;
            if (cargo.damageBonus) damageMultiplier += cargo.damageBonus;
            if (cargo.bonusLife) bonusLives += cargo.bonusLife;
            if (cargo.fireRateBonus) fireRateMultiplier += cargo.fireRateBonus;
        });
        
        const baseSpeed = 4 * gameScale;
        const speedBonus = getShipSpeedBonus() / 100;
        player.speed = baseSpeed * (1 + speedBonus) * speedMultiplier;
        
        gameState.lives = 3 + bonusLives;
        
        player.turrets = [];
        const positions = [
            { x: 0, y: -15 }, { x: -20, y: -10 }, { x: 20, y: -10 }, { x: -30, y: 0 },
            { x: 30, y: 0 }, { x: -40, y: 10 }, { x: 40, y: 10 }
        ];
        
        for (let i = 0; i < gameState.turretCount; i++) {
            if (i < positions.length) {
                player.turrets.push({
                    x: positions[i].x * gameScale,
                    y: positions[i].y * gameScale,
                    lastShot: 0,
                    damage: gameState.damageLevel * damageMultiplier
                });
            }
        }
        
        bullets = []; turretBullets = []; enemies = []; explosions = [];
        enemyBullets = []; miniFighters = [];
        createStars();
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 * gameScale,
                speed: -(Math.random() * 0.5 + 0.1) * gameScale
            });
        }
    }

    function shoot() {
        if (!gameState.gameOver && !gameState.stageComplete) {
            bullets.push({
                x: player.x + player.width / 2,
                y: player.y,
                width: 4 * gameScale,
                height: 10 * gameScale,
                speed: 7 * gameScale,
                color: '#ffff00'
            });
            playSound(800, 0.1);
        }
    }

    // ===== 적 생성 시스템 =====
    function spawnEnemy() {
        const now = Date.now();
        const destination = DESTINATIONS[gameState.selectedDestination];
        let spawnRate = 1000 / destination.difficulty;
        
        if (gameState.selectedCargos.includes('military')) {
            spawnRate /= 1.3;
        }
        
        if (now - gameState.lastEnemySpawn > spawnRate - gameState.stage * 100) {
            const spawnSide = Math.random();
            let enemyX, enemyY;
            
            if (spawnSide < 0.7) {
                enemyX = Math.random() * canvas.width;
                enemyY = -30;
            } else {
                if (Math.random() < 0.5) {
                    enemyX = -30;
                    enemyY = Math.random() * canvas.height * 0.6;
                } else {
                    enemyX = canvas.width + 30;
                    enemyY = Math.random() * canvas.height * 0.6;
                }
            }
            
            spawnNormalEnemy(enemyX, enemyY, destination);
            gameState.lastEnemySpawn = now;
        }
    }

    function spawnNormalEnemy(enemyX, enemyY, destination) {
        const difficultyBonus = destination.difficulty - 1;
        const enemyType = Math.random() + difficultyBonus * 0.2;
        let enemy;
        
        const baseSize = 25 * gameScale;
        const baseSpeed = gameScale;
        
        if (enemyType < 0.6) {
            enemy = {
                x: enemyX, y: enemyY, width: baseSize, height: baseSize,
                speed: (Math.random() * 1.5 + 1 + gameState.stage * 0.2) * baseSpeed * destination.difficulty,
                color: '#ff6600', type: 'normal', hp: 1, maxHp: 1,
                goldValue: 5 + gameState.stage
            };
        } else if (enemyType < 0.85) {
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 1.2, height: baseSize * 1.2,
                speed: (Math.random() * 1.2 + 0.8 + gameState.stage * 0.15) * baseSpeed * destination.difficulty,
                color: '#ff0000', type: 'strong', 
                hp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                maxHp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                goldValue: 12 + gameState.stage * 2
            };
        } else {
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 0.8, height: baseSize * 0.8,
                speed: (Math.random() * 2 + 2 + gameState.stage * 0.3) * baseSpeed * destination.difficulty,
                color: '#ff00ff', type: 'fast', hp: 1, maxHp: 1,
                goldValue: 8 + gameState.stage
            };
        }
        
        enemies.push(enemy);
    }

    function createExplosion(x, y) {
        for (let i = 0; i < 5; i++) {
            explosions.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 4 * gameScale,
                vy: (Math.random() - 0.5) * 4 * gameScale,
                life: 20, maxLife: 20, color: '#ff8800'
            });
        }
    }

    function upgradeDamage() {
        const cost = 50 + (gameState.damageLevel - 1) * 25;
        if (gameState.gold >= cost) {
            gameState.gold -= cost;
            gameState.damageLevel++;
            player.turrets.forEach(turret => {
                turret.damage = gameState.damageLevel;
            });
            playSound(400, 0.2);
            updateUI();
        }
    }

    function upgradeSpeed() {
        const cost = 75 + (gameState.speedLevel - 1) * 25;
        if (gameState.gold >= cost) {
            gameState.gold -= cost;
            gameState.speedLevel++;
            player.speed = player.speed * 1.1;
            playSound(400, 0.2);
            updateUI();
        }
    }

    function addTurret() {
        const maxTurrets = getMaxTurretCount();
        if (gameState.gold >= 100 && player.turrets.length < maxTurrets) {
            gameState.gold -= 100;
            gameState.turretCount++;
            
            const positions = [
                { x: 0, y: -15 }, { x: -20, y: -10 }, { x: 20, y: -10 }, { x: -30, y: 0 },
                { x: 30, y: 0 }, { x: -40, y: 10 }, { x: 40, y: 10 }
            ];
            
            if (player.turrets.length < positions.length) {
                player.turrets.push({
                    x: positions[player.turrets.length].x * gameScale,
                    y: positions[player.turrets.length].y * gameScale,
                    lastShot: 0, damage: gameState.damageLevel
                });
            }
            
            playSound(500, 0.2);
            updateUI();
        }
    }

    function showGameOver() {
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('gameOverModal').style.display = 'block';
        gameState.inGame = false;
        gameLoopRunning = false;
    }

    function showStageClear() {
        const destination = DESTINATIONS[gameState.selectedDestination];
        let goldReward = Math.floor(gameState.score * 0.1 * destination.goldMultiplier);
        let diamondReward = 0;
        
        gameState.selectedCargos.forEach(cargoKey => {
            const cargo = CARGO_TYPES[cargoKey];
            diamondReward += cargo.reward * destination.diamondMultiplier;
            if (cargo.goldReward) goldReward += 20;
            if (cargo.diamondReward) diamondReward += 15;
        });
        
        gameState.gold += goldReward;
        gameState.diamonds += Math.floor(diamondReward);
        
        document.getElementById('rewardGold').textContent = goldReward;
        document.getElementById('rewardDiamonds').textContent = Math.floor(diamondReward);
        document.getElementById('stageClearModal').style.display = 'block';
        
        gameState.inGame = false;
        gameLoopRunning = false;
    }

    function returnToPrep() {
        gameState.inGame = false;
        gameState.gameOver = false;
        gameState.stageComplete = false;
        gameLoopRunning = false;
        
        gameState.selectedDestination = null;
        gameState.selectedCargos = [];
        gameState.damageLevel = 1;
        gameState.speedLevel = 1;
        gameState.turretCount = 1;
        gameState.score = 0;
        gameState.stage = 1;
        
        document.querySelectorAll('.card, .cargo-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.getElementById('selectedCargoCount').textContent = '0';
        document.getElementById('destinationInfo').style.display = 'none';
        updateStartButton();
        updatePrepUI();
        updateCargoSlotDisplay();
        
        document.getElementById('prepScreen').style.display = 'block';
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('stageClearModal').style.display = 'none';
    }

    // ===== 업데이트 함수들 =====
    function updatePlayer() {
        if (touchTarget.active) {
            const dx = touchTarget.x - (player.x + player.width / 2);
            const dy = touchTarget.y - (player.y + player.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const moveSpeed = Math.min(player.speed, distance * 0.1);
                const moveX = (dx / distance) * moveSpeed;
                const moveY = (dy / distance) * moveSpeed;
                
                player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + moveX));
                player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + moveY));
            }
        }
        
        if (gameState.keys['a'] || gameState.keys['arrowleft']) {
            player.x = Math.max(0, player.x - player.speed);
        }
        if (gameState.keys['d'] || gameState.keys['arrowright']) {
            player.x = Math.min(canvas.width - player.width, player.x + player.speed);
        }
        if (gameState.keys['w'] || gameState.keys['arrowup']) {
            player.y = Math.max(0, player.y - player.speed);
        }
        if (gameState.keys['s'] || gameState.keys['arrowdown']) {
            player.y = Math.min(canvas.height - player.height, player.y + player.speed);
        }
    }

    function updateBullets() {
        bullets = bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > -bullet.height;
        });
        
        turretBullets = turretBullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            return bullet.x > -50 && bullet.x < canvas.width + 50 && 
                   bullet.y > -50 && bullet.y < canvas.height + 50;
        });
        
        enemyBullets = enemyBullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            if (checkCollision(bullet, player)) {
                createExplosion(bullet.x, bullet.y);
                playSound(200, 0.2);
                gameState.lives--;
                if (gameState.lives <= 0) {
                    gameState.gameOver = true;
                    showGameOver();
                }
                return false;
            }
            
            return bullet.x > -50 && bullet.x < canvas.width + 50 && 
                   bullet.y > -50 && bullet.y < canvas.height + 50;
        });
    }

    function updateEnemies() {
        enemies = enemies.filter(enemy => {
            // 플레이어를 향해 이동
            const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
            const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            }
            
            // 플레이어와 충돌 체크
            if (checkCollision(enemy, player)) {
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                playSound(200, 0.2);
                gameState.lives--;
                if (gameState.lives <= 0) {
                    gameState.gameOver = true;
                    showGameOver();
                }
                return false;
            }
            
            return enemy.x > -100 && enemy.x < canvas.width + 100 && 
                   enemy.y > -100 && enemy.y < canvas.height + 100;
        });
    }

    function checkBulletCollisions() {
        // 플레이어 총알과 적의 충돌
        bullets.forEach((bullet, bulletIndex) => {
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(bullet, enemy)) {
                    bullets.splice(bulletIndex, 1);
                    enemy.hp -= 1;
                    
                    if (enemy.hp <= 0) {
                        createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        gameState.score += enemy.goldValue;
                        gameState.gold += enemy.goldValue;
                        enemies.splice(enemyIndex, 1);
                        playSound(300, 0.15);
                    }
                }
            });
        });

        // 포탑 총알과 적의 충돌
        turretBullets.forEach((bullet, bulletIndex) => {
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(bullet, enemy)) {
                    turretBullets.splice(bulletIndex, 1);
                    enemy.hp -= bullet.damage;
                    
                    if (enemy.hp <= 0) {
                        createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        gameState.score += enemy.goldValue;
                        gameState.gold += enemy.goldValue;
                        enemies.splice(enemyIndex, 1);
                        playSound(300, 0.15);
                    }
                }
            });
        });
    }

    function updateTurrets() {
        const now = Date.now();
        const fireRateBonus = getFireRateBonus();
        const baseInterval = 250 / (1 + fireRateBonus / 100);
        
        player.turrets.forEach(turret => {
            if (now - turret.lastShot > baseInterval && enemies.length > 0) {
                // 가장 가까운 적 찾기
                let closestEnemy = null;
                let closestDistance = Infinity;
                
                enemies.forEach(enemy => {
                    const dx = enemy.x + enemy.width/2 - (player.x + turret.x + player.width/2);
                    const dy = enemy.y + enemy.height/2 - (player.y + turret.y + player.height/2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
                
                if (closestEnemy && closestDistance < 300 * gameScale) {
                    const dx = closestEnemy.x + closestEnemy.width/2 - (player.x + turret.x + player.width/2);
                    const dy = closestEnemy.y + closestEnemy.height/2 - (player.y + turret.y + player.height/2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const bulletSpeed = 8 * gameScale;
                    const vx = (dx / distance) * bulletSpeed;
                    const vy = (dy / distance) * bulletSpeed;
                    
                    turretBullets.push({
                        x: player.x + turret.x + player.width/2,
                        y: player.y + turret.y + player.height/2,
                        width: 3 * gameScale,
                        height: 3 * gameScale,
                        vx: vx,
                        vy: vy,
                        damage: turret.damage,
                        color: '#00ff00'
                    });
                    
                    turret.lastShot = now;
                    playSound(600, 0.08);
                }
            }
        });
    }

    function updateExplosions() {
        explosions = explosions.filter(explosion => {
            explosion.x += explosion.vx;
            explosion.y += explosion.vy;
            explosion.life--;
            return explosion.life > 0;
        });
    }

    function updateTimer() {
        const now = Date.now();
        if (now - gameState.lastTimerUpdate > 1000) {
            gameState.stageTimer--;
            gameState.lastTimerUpdate = now;
            
            if (gameState.stageTimer <= 0) {
                gameState.stageComplete = true;
                showStageClear();
            }
        }
    }

    function updateStars() {
        stars.forEach(star => {
            star.y -= star.speed;
            if (star.y < -5) {
                star.y = canvas.height + 5;
                star.x = Math.random() * canvas.width;
            }
        });
    }

    // ===== 렌더링 함수들 =====
    function drawPlayer() {

        ctx.save();


        // 우주선 본체
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // 우주선 디테일
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x + player.width * 0.4, player.y + player.height * 0.1,
                    player.width * 0.2, player.height * 0.3);

        // 포탑들
        ctx.fillStyle = '#00ff00';
        player.turrets.forEach(turret => {
            ctx.fillRect(player.x + turret.x + player.width/2 - 3*gameScale,
                        player.y + turret.y + player.height/2 - 3*gameScale,
                        6*gameScale, 6*gameScale);
        });

        ctx.restore();
    }

    function drawBullets() {
        // 플레이어 총알
        ctx.fillStyle = '#ffff00';
        bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // 포탑 총알
        ctx.fillStyle = '#00ff00';
        turretBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // 적 총알
        ctx.fillStyle = '#ff0000';
        enemyBullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    function drawEnemies() {
        enemies.forEach(enemy => {
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

            const barWidth = enemy.width;
            const barHeight = 4 * gameScale;
            const barY = enemy.y - barHeight - 2;

            if (enemy.hp < enemy.maxHp) {
                const healthRatio = enemy.hp / enemy.maxHp;

                ctx.fillStyle = '#ff0000';
                ctx.fillRect(enemy.x, barY, barWidth, barHeight);

                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.x, barY, barWidth * healthRatio, barHeight);
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = `${10 * gameScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(enemy.hp, enemy.x + barWidth / 2, barY - 2);

            ctx.restore();
        });
    }

    function drawExplosions() {
        explosions.forEach(explosion => {
            const alpha = explosion.life / explosion.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = explosion.color;
            ctx.fillRect(explosion.x - 2, explosion.y - 2, 4 * gameScale, 4 * gameScale);
        });
        ctx.globalAlpha = 1;
    }

    function drawStars() {
        ctx.fillStyle = '#ffffff';
        stars.forEach(star => {
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }

    function drawUI() {
        // 게임 상태 표시
        ctx.fillStyle = 'white';
        ctx.font = `${12 * gameScale}px Arial`;
        ctx.fillText(`점수: ${gameState.score}`, 10, 25);
        ctx.fillText(`골드: ${gameState.gold}`, 10, 45);
        ctx.fillText(`생명: ${gameState.lives}`, 10, 65);
        ctx.fillText(`시간: ${gameState.stageTimer}s`, 10, 85);
    }

    // ===== 이벤트 리스너들 =====
    function setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            gameState.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') {
                e.preventDefault();
                shoot();
            }
        });

        document.addEventListener('keyup', (e) => {
            gameState.keys[e.key.toLowerCase()] = false;
        });

        // 터치 이벤트
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!audioContext) initAudio();
            
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            touchTarget.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
            touchTarget.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
            touchTarget.active = true;
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            touchTarget.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
            touchTarget.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchTarget.active = false;
        });

        // 마우스 이벤트
        canvas.addEventListener('mousedown', (e) => {
            if (!audioContext) initAudio();
            
            const rect = canvas.getBoundingClientRect();
            touchTarget.x = (e.clientX - rect.left) * (canvas.width / rect.width);
            touchTarget.y = (e.clientY - rect.top) * (canvas.height / rect.height);
            touchTarget.active = true;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (touchTarget.active) {
                const rect = canvas.getBoundingClientRect();
                touchTarget.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                touchTarget.y = (e.clientY - rect.top) * (canvas.height / rect.height);
            }
        });

        canvas.addEventListener('mouseup', () => {
            touchTarget.active = false;
        });

        // 창 크기 변경 이벤트
        window.addEventListener('resize', () => {
            if (gameState.inGame) {
                resizeCanvas();
            }
        });
    }

    // ===== 메인 게임 루프 =====
    function gameLoop() {
        if (!gameState.inGame || gameState.gameOver || gameState.stageComplete) {
            gameLoopRunning = false;
            return;
        }

        // 화면 클리어
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 배경 별들 그리기
        drawStars();

        // 자동 사격
        autoShootTimer++;
        if (autoShootTimer > 15) {
            shoot();
            autoShootTimer = 0;
        }

        // 적 생성
        spawnEnemy();

        // 업데이트
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateTurrets();
        updateExplosions();
        updateTimer();
        updateStars();
        checkBulletCollisions();

        // 렌더링
        drawPlayer();
        drawBullets();
        drawEnemies();
        drawExplosions();
        drawUI();

        // UI 업데이트
        updateUI();

        // 다음 프레임 요청
        if (gameLoopRunning) {
            requestAnimationFrame(gameLoop);
        }
    }

    // ===== 초기화 =====
    window.addEventListener('load', () => {
        setupEventListeners();
        updatePrepUI();
        updateCargoSlotDisplay();
        resizeCanvas();
    });

    window.startGame = startGame;
    window.selectDestination = selectDestination;
    window.selectCargo = selectCargo;
    window.upgradeShipSpeed = upgradeShipSpeed;
    window.upgradeMaxTurrets = upgradeMaxTurrets;
    window.upgradeCargoCapacity = upgradeCargoCapacity;
    window.upgradeFireRate = upgradeFireRate;
    window.upgradeDamage = upgradeDamage;
    window.upgradeSpeed = upgradeSpeed;
    window.addTurret = addTurret;
    window.returnToPrep = returnToPrep;
})();
