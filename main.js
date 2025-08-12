"use strict";

    // ===== 데이터(목적지/화물) 외부 분리 참조 =====
    const DESTINATIONS = window.DESTINATIONS || {};

    const CARGO_TYPES = window.CARGO_TYPES || {};

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
        cargoCapacityLevel: 1, fireRateLevel: 1, selectedDestination: null, selectedCargos: [],
        bossSpawned: false, currentBoss: null
    };

    const player = {
        x: 384, y: 900, width: 40, height: 40, speed: 4, color: '#00ffff', turrets: []
    };

    let bullets = [], turretBullets = [], enemies = [], explosions = [], stars = [], gameLoopRunning = false;
    let enemyBullets = [], miniFighters = [];

    // 외부 모듈(enemies.js, formations.js)에서 접근 필요: 전역으로 노출
    window.gameState = gameState;
    window.player = player;
    window.enemies = enemies;
    window.enemyBullets = enemyBullets;
    window.bullets = bullets;
    window.turretBullets = turretBullets;
    Object.defineProperty(window, 'gameScale', {
        get() { return gameScale; },
        set(v) { gameScale = v; }
    });
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
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('사운드 재생 실패:', e);
        }
    }

    // ===== 준비 화면 토글 =====
    function toggleDiamondUpgrades() {
        const section = document.getElementById('diamondUpgrades');
        const btn = document.getElementById('toggleDiamondUpgradesBtn');
        if (!section || !btn) return;
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'grid' : 'none';
        btn.textContent = isHidden ? '접기' : '펼치기';
    }

    function resizeCanvas() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 목표 해상도 비율(세로형 768x1024)을 유지하면서
        // 가용 뷰포트에 맞게 최대 크기로 스케일링
        const targetWidth = 768;
        const targetHeight = 1024;

        // PC/모바일 레이아웃 별 여백/스케일 전략 분리
        let scale;
        let canvasWidth;
        let canvasHeight;

        if (isMobile || windowWidth <= 900) {
            // 모바일: 가로를 꽉 채우되, 세로 여유를 조금 남김
            const horizontalPadding = 12;
            const verticalReserve = 140; // 하단 정보 등
            const scaleX = (windowWidth - horizontalPadding) / targetWidth;
            const scaleY = (windowHeight - verticalReserve) / targetHeight;
            scale = Math.max(0.5, Math.min(scaleX, scaleY));
            canvasWidth = Math.floor(targetWidth * scale);
            canvasHeight = Math.floor(targetHeight * scale);
        } else {
            // PC: 목표 폭 768을 유지하며, 높이는 뷰포트에 맞춰 축소만 (최소 스케일 가드)
            scale = Math.max(0.5, Math.min(1, (windowHeight - 160) / targetHeight));
            canvasWidth = Math.floor(targetWidth * scale);
            canvasHeight = Math.floor(targetHeight * scale);
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        gameScale = scale;
        // 전역 참조 사용 시 즉시 반영
        // (getter/setter로 이미 반영되지만 안정성 차원에서 값 확인용)
        window.gameScale = gameScale;

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

    // ===== 다이아 상점 관련 변수들 =====
    let currentShopItem = null;
    let currentShopCost = 0;

    // ===== 다이아 상점 표시 함수 =====
    function showDiamondShop(itemType) {
        currentShopItem = itemType;
        const prep = document.getElementById('prepScreen');
        const shop = document.getElementById('diamondShopScreen');
        const canvas = document.getElementById('diamondShopCanvas');
        const ctx = canvas.getContext('2d');
        const details = document.getElementById('diamondShopDetails');

        prep.style.display = 'none';
        shop.style.display = 'flex';

        // 캔버스 그리기
        drawDiamondShop(ctx);

        // 상점 상세 정보 표시
        let itemName, itemDesc, currentLevel, nextLevel, cost;
        
        switch(itemType) {
            case 'speed':
                itemName = '🚀 엔진 업그레이드';
                itemDesc = '우주선의 이동 속도를 증가시킵니다.';
                currentLevel = gameState.shipSpeedLevel;
                nextLevel = currentLevel + 1;
                cost = 5 + (currentLevel - 1) * 3;
                break;
            case 'turret':
                itemName = '🎯 포탑 업그레이드';
                itemDesc = '최대 포탑 개수를 증가시킵니다.';
                currentLevel = gameState.maxTurretLevel;
                nextLevel = currentLevel + 1;
                cost = 8 + (currentLevel - 1) * 5;
                break;
            case 'cargo':
                itemName = '📦 화물 용량 업그레이드';
                itemDesc = '화물 슬롯 개수를 증가시킵니다.';
                currentLevel = gameState.cargoCapacityLevel;
                nextLevel = currentLevel + 1;
                cost = 10 + (currentLevel - 1) * 7;
                break;
            case 'fireRate':
                itemName = '🔥 연사 속도 업그레이드';
                itemDesc = '포탑의 발사 속도를 증가시킵니다.';
                currentLevel = gameState.fireRateLevel;
                nextLevel = currentLevel + 1;
                cost = 6 + (currentLevel - 1) * 4;
                break;
        }

        currentShopCost = cost;
        
        details.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; color: #00ffff; margin-bottom: 15px;">${itemName}</div>
            <div style="color: #ccc; margin-bottom: 15px;">${itemDesc}</div>
            <div style="color: #fff; margin-bottom: 10px;">
                <strong>현재 레벨:</strong> ${currentLevel}<br>
                <strong>다음 레벨:</strong> ${nextLevel}
            </div>
            <div style="color: #ffaa00; font-size: 16px; font-weight: bold;">
                💎 비용: ${cost} 다이아
            </div>
            <div style="color: #0f0; margin-top: 10px;">
                💎 보유: ${gameState.diamonds} 다이아
            </div>
        `;

        // 구매 버튼 활성화/비활성화
        const confirmBtn = document.querySelector('#diamondShopButtons .btn:first-child');
        if (gameState.diamonds >= cost) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        }
    }

    // ===== 다이아 상점 캔버스 그리기 =====
    function drawDiamondShop(ctx) {
        const canvas = ctx.canvas;
        
        // 배경 그리기
        ctx.fillStyle = '#001122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 별들 그리기
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            ctx.fillRect(x, y, size, size);
        }
        
        // 중앙에 상점 아이콘 그리기
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // 다이아몬드 모양 그리기
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 60);
        ctx.lineTo(centerX + 40, centerY - 20);
        ctx.lineTo(centerX + 40, centerY + 20);
        ctx.lineTo(centerX, centerY + 60);
        ctx.lineTo(centerX - 40, centerY + 20);
        ctx.lineTo(centerX - 40, centerY - 20);
        ctx.closePath();
        ctx.fill();
        
        // 상점 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💎 DIAMOND SHOP 💎', centerX, centerY + 120);
    }

    // ===== 다이아 상점 닫기 =====
    function closeDiamondShop() {
        document.getElementById('diamondShopScreen').style.display = 'none';
        document.getElementById('prepScreen').style.display = 'block';
        currentShopItem = null;
        currentShopCost = 0;
    }

    // ===== 구매 확인 다이얼로그 표시 =====
    function confirmPurchase() {
        if (!currentShopItem || gameState.diamonds < currentShopCost) return;
        
        const modal = document.getElementById('purchaseConfirmModal');
        const text = document.getElementById('purchaseConfirmText');
        
        let itemName;
        switch(currentShopItem) {
            case 'speed': itemName = '엔진 업그레이드'; break;
            case 'turret': itemName = '포탑 업그레이드'; break;
            case 'cargo': itemName = '화물 용량 업그레이드'; break;
            case 'fireRate': itemName = '연사 속도 업그레이드'; break;
        }
        
        text.textContent = `${itemName}을(를) ${currentShopCost} 다이아로 구매하시겠습니까?`;
        modal.style.display = 'block';
    }

    // ===== 구매 확인 모달 닫기 =====
    function closePurchaseModal() {
        document.getElementById('purchaseConfirmModal').style.display = 'none';
    }

    // ===== 구매 실행 =====
    function executePurchase() {
        if (!currentShopItem || gameState.diamonds < currentShopCost) return;
        
        // 구매 실행
        switch(currentShopItem) {
            case 'speed':
                gameState.diamonds -= currentShopCost;
                gameState.shipSpeedLevel++;
                break;
            case 'turret':
                gameState.diamonds -= currentShopCost;
                gameState.maxTurretLevel++;
                break;
            case 'cargo':
                gameState.diamonds -= currentShopCost;
                gameState.cargoCapacityLevel++;
                updateCargoSlotDisplay();
                break;
            case 'fireRate':
                gameState.diamonds -= currentShopCost;
                gameState.fireRateLevel++;
                break;
        }
        
        playSound(600, 0.1);
        updatePrepUI();
        
        // 속도 업그레이드 후 예상 제한시간 업데이트
        if (currentShopItem === 'speed') {
            updateExpectedTimeDisplay();
        }
        
        // 모달과 상점 닫기
        closePurchaseModal();
        closeDiamondShop();
    }

    // ===== UI 관련 함수들 =====
    function selectDestination(destKey) {
        // DESTINATIONS가 로드되지 않았으면 기본값 사용
        if (!DESTINATIONS[destKey]) {
            console.warn('DESTINATIONS not loaded, using fallback');
            return;
        }
        
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
        
        updateExpectedTimeDisplay();
        updateStartButton();
    }

    function selectCargo(cargoKey) {
        // CARGO_TYPES가 로드되지 않았으면 기본값 사용
        if (!CARGO_TYPES[cargoKey]) {
            console.warn('CARGO_TYPES not loaded, using fallback');
            return;
        }
        
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
        updateExpectedTimeDisplay();
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
        
        // 선택된 목적지가 있을 때 예상 제한시간 표시
        if (gameState.selectedDestination) {
            updateExpectedTimeDisplay();
        }
    }

    function updateCargoSlotDisplay() {
        const maxSlots = getMaxCargoSlots();
        document.getElementById('selectedCargoCount').textContent = gameState.selectedCargos.length;
        document.getElementById('maxCargoSlots').textContent = maxSlots;
        document.getElementById('maxCargoDisplay').textContent = maxSlots;
    }

    // 예상 제한시간 계산 및 표시
    function updateExpectedTimeDisplay() {
        if (!gameState.selectedDestination) return;
        
        const destination = DESTINATIONS[gameState.selectedDestination];
        if (!destination) return;
        
        const baseTime = destination.time;
        
        // 현재 우주선 속도와 선택된 화물을 고려한 예상 시간 계산
        let speedMultiplier = 1;
        gameState.selectedCargos.forEach(cargoKey => {
            const cargo = CARGO_TYPES[cargoKey];
            if (cargo && cargo.speedPenalty) speedMultiplier -= cargo.speedPenalty;
            if (cargo && cargo.speedBonus) speedMultiplier += cargo.speedBonus;
        });
        
        const speedBonus = getShipSpeedBonus() / 100;
        const totalSpeedMultiplier = (1 + speedBonus) * speedMultiplier;
        const timeReduction = Math.min(0.4, (totalSpeedMultiplier - 1) * 0.3);
        const expectedTime = Math.max(baseTime * 0.6, baseTime * (1 - timeReduction));
        
        // 시간 단축 효과 표시
        const timeInfo = document.getElementById('expectedTimeInfo');
        if (timeInfo) {
            const timeSaved = baseTime - expectedTime;
            const timeReductionPercent = Math.round((timeSaved / baseTime) * 100);
            
            if (timeSaved > 0) {
                timeInfo.innerHTML = `
                    <div style="color: #00ff00; font-size: 12px; margin-top: 5px;">
                        ⚡ 속도 업그레이드 효과: ${timeReductionPercent}% 시간 단축
                        <br><span style="color: #ccc;">기본: ${baseTime}초 → 예상: ${Math.round(expectedTime)}초</span>
                    </div>
                `;
                timeInfo.style.display = 'block';
            } else {
                timeInfo.innerHTML = `
                    <div style="color: #ccc; font-size: 12px; margin-top: 5px;">
                        기본 제한시간: ${baseTime}초
                    </div>
                `;
                timeInfo.style.display = 'block';
            }
        }
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
        
        // 인터미션으로 진입
        if (!audioContext) initAudio();
        showIntermissionAndLoad();
    }

    // ===== 인터미션: 화물 적재 애니메이션 =====
    function showIntermissionAndLoad() {
        const prep = document.getElementById('prepScreen');
        const inter = document.getElementById('intermissionScreen');
        const interCanvas = document.getElementById('intermissionCanvas');
        const ictx = interCanvas.getContext('2d');
        // 인터미션 캔버스 리사이즈
        resizeIntermissionCanvas();
        const interScale = interCanvas.width / 768; // 기준 폭 대비 스케일
        
        prep.style.display = 'none';
        inter.style.display = 'flex';
        
        const totalBoxes = gameState.selectedCargos.length;
        const ship = { 
            x: 40 * interScale, 
            y: interCanvas.height - 80 * interScale, 
            w: 120 * interScale, 
            h: 40 * interScale 
        };
        const bay = { 
            x: ship.x + ship.w - 20 * interScale, 
            y: ship.y - 10 * interScale, 
            w: 30 * interScale, 
            h: 30 * interScale 
        };
        
        let loaded = 0;
        let lastTime = 0;
        let animId = 0;
        
        function drawBackground() {
            ictx.clearRect(0, 0, interCanvas.width, interCanvas.height);
            // 바닥 라인
            ictx.fillStyle = '#331100';
            ictx.fillRect(0, ship.y + ship.h, interCanvas.width, 4 * interScale);
            // 우주선
            ictx.fillStyle = '#00cccc';
            ictx.fillRect(ship.x, ship.y, ship.w, ship.h);
            // 적재함 표시
            ictx.fillStyle = '#003333';
            ictx.fillRect(bay.x, bay.y, bay.w, bay.h);
            // 텍스트
            ictx.fillStyle = '#ffaa00';
            ictx.font = `${Math.round(16 * interScale)}px Arial`;
            ictx.fillText(`적재 ${loaded}/${totalBoxes}`, 20 * interScale, 30 * interScale);
        }
        
        function drawBox(x, y, color) {
            ictx.fillStyle = color;
            ictx.fillRect(x, y, 24 * interScale, 24 * interScale);
            ictx.strokeStyle = '#000';
            ictx.strokeRect(x, y, 24 * interScale, 24 * interScale);
        }
        
        function animateBoxLoad(index) {
            const startX = interCanvas.width - 80 * interScale;
            const startY = ship.y - 10 * interScale;
            const endX = bay.x + 4 * interScale + (index % 2) * 10 * interScale;
            const endY = bay.y + 4 * interScale + Math.floor(index / 2) * 10 * interScale;
            const color = ['#ffaa00','#aaff00','#00ffaa','#00aaff','#aa00ff','#ff00aa','#ff6600','#66ff00'][index % 8];
            const duration = 600; // ms
            let t0;
            
            function step(ts) {
                if (!t0) t0 = ts;
                const p = Math.min(1, (ts - t0) / duration);
                const x = startX + (endX - startX) * p;
                const y = startY + (endY - startY) * p;
                drawBackground();
                // 이미 적재된 박스 그리기
                for (let i = 0; i < loaded; i++) {
                    const ix = bay.x + 4 * interScale + (i % 2) * 10 * interScale;
                    const iy = bay.y + 4 * interScale + Math.floor(i / 2) * 10 * interScale;
                    drawBox(ix, iy, ['#ffaa00','#aaff00','#00ffaa','#00aaff','#aa00ff','#ff00aa','#ff6600','#66ff00'][i % 8]);
                }
                // 이동 중 박스
                drawBox(x, y, color);
                if (p < 1) {
                    animId = requestAnimationFrame(step);
                } else {
                    loaded++;
                    playSound(400, 0.08);
                    if (loaded < totalBoxes) {
                        animateBoxLoad(loaded);
                    } else {
                        // 잠시 표시 후 게임 시작
                        setTimeout(() => {
                            inter.style.display = 'none';
                            startActualGameplay();
                        }, 300);
                    }
                }
            }
            animId = requestAnimationFrame(step);
        }
        
        drawBackground();
        if (totalBoxes > 0) {
            animateBoxLoad(0);
        } else {
            // 선택 화물이 없으면 짧은 대기 후 바로 시작
            setTimeout(() => {
                inter.style.display = 'none';
                startActualGameplay();
            }, 300);
        }

        // 화면 회전/리사이즈 시 인터미션도 즉시 리사이즈
        const intermissionResizeHandler = () => {
            if (inter.style.display === 'flex') {
                resizeIntermissionCanvas();
                // 크기 변경 시 배경만 재그림 (애니메이션 프레임은 다음 사이클에서 반영)
                drawBackground();
            }
        };
        window.addEventListener('resize', intermissionResizeHandler, { passive: true });

        // 인터미션 종료 시 리스너 제거
        const cleanup = () => window.removeEventListener('resize', intermissionResizeHandler);
        // 게임 시작으로 넘어갈 때 정리되도록 래핑
        const originalStartActualGameplay = startActualGameplay;
        window.startActualGameplay = function() {
            cleanup();
            originalStartActualGameplay();
            window.startActualGameplay = originalStartActualGameplay; // 원복
        };
    }

    // 인터미션 캔버스 리사이즈 함수
    function resizeIntermissionCanvas() {
        const interCanvas = document.getElementById('intermissionCanvas');
        if (!interCanvas) return;
        const windowWidth = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
        const windowHeight = (window.visualViewport && window.visualViewport.height) || window.innerHeight;

        const targetWidth = 768;
        const targetHeight = 260;

        let scale;
        let width;
        let height;

        if (isMobile || windowWidth <= 900) {
            const horizontalPadding = 8;   // 모바일에서는 여백 최소화
            const verticalReserve = 80;    // 상/하단 여백 줄여서 더 크게 표시
            const scaleX = (windowWidth - horizontalPadding) / targetWidth;
            const scaleY = (windowHeight - verticalReserve) / targetHeight;
            // 모바일에서는 가로 기준으로 크게 보이게, 세로는 넘치지 않게 제한
            scale = Math.max(0.5, Math.min(scaleX, scaleY));
        } else {
            scale = Math.min(1, (windowHeight - 280) / targetHeight);
        }

        width = Math.floor(targetWidth * scale);
        height = Math.floor(targetHeight * scale);

        interCanvas.width = width;
        interCanvas.height = height;
        // CSS 사이즈도 명시하여 레이아웃 일치
        interCanvas.style.width = width + 'px';
        interCanvas.style.height = height + 'px';
    }

    function startActualGameplay() {
        resizeCanvas();
        initializeGame();
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
        
        // 우주선 속도에 따라 제한시간 조정
        const totalSpeedMultiplier = (1 + speedBonus) * speedMultiplier;
        const timeReduction = Math.min(0.4, (totalSpeedMultiplier - 1) * 0.3); // 최대 40%까지 시간 단축
        gameState.stageTimer = Math.max(destination.time * 0.6, destination.time * (1 - timeReduction));
        
        gameState.lives = 3 + bonusLives;
        
        // 보스 상태 초기화
        gameState.bossSpawned = false;
        gameState.currentBoss = null;
        
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
            // 공용 총알 함수 사용
            const bullet = createBullet(
                player.x + player.width / 2,
                player.y,
                4 * gameScale,
                10 * gameScale,
                0, // vx (플레이어 총알은 위로만 이동)
                -7 * gameScale, // vy (위로 이동)
                'player',
                '#ffff00'
            );
            bullets.push(bullet);
            playSound(800, 0.05);
        }
    }

    // ===== 적 생성 시스템 =====
    function spawnEnemy() {
        const now = Date.now();
        const destination = DESTINATIONS[gameState.selectedDestination];
        
        // 제한시간 기반 난이도: 남은 시간이 적을수록 적 스폰 속도 증가
        const timePressure = Math.max(0, (120 - gameState.stageTimer) / 120); // 0~1 사이 값
        const timeMultiplier = 1 + timePressure * 2; // 최대 3배까지 스폰 속도 증가
        
        // 적 발생수를 80%로 줄임 (스폰 속도를 1.5625배로 증가)
        let spawnRate = (1000 / destination.difficulty) * 1.5625 / timeMultiplier;
        
        if (gameState.selectedCargos.includes('military')) {
            spawnRate /= 1.3;
        }
        
        // 스테이지별 보스 스폰 체크
        if (gameState.stage >= 2 && !gameState.bossSpawned) {
            const bossSpawnChance = 0.001; // 0.1% 확률로 보스 스폰
            if (Math.random() < bossSpawnChance) {
                spawnBoss();
                gameState.bossSpawned = true;
                return;
            }
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
            
            // 일정 확률로 편대 스폰
            const formationChance = Math.min(0.1 + gameState.stage * 0.02, 0.5); // 단계가 오를수록 편대 확률 증가(최대 50%)
            if (window.spawnFormation && Math.random() < formationChance) {
                const idx = Math.floor(Math.random() * (window.FORMATIONS?.length || 0));
                if (!isNaN(idx) && (window.FORMATIONS?.[idx])) {
                    window.spawnFormation(idx, { speedMul: 1 + (timePressure * 0.5) });
                } else {
                    spawnNormalEnemy(enemyX, enemyY, destination);
                }
            } else {
                spawnNormalEnemy(enemyX, enemyY, destination);
            }
            gameState.lastEnemySpawn = now;
        }
    }

    function spawnNormalEnemy(enemyX, enemyY, destination) {
        const difficultyBonus = destination.difficulty - 1;
        const enemyType = Math.random() + difficultyBonus * 0.2;
        let enemy;
        
        // 적 크기 1.5배 확대
        const baseSize = 25 * gameScale * 1.5;
        const baseSpeed = gameScale;
        
        // 적의 색깔에 따라 AI 타입 고정
        if (enemyType < 0.2) {
            // 1. 자폭형 적: 플레이어를 향해 날아와서 충돌 시 자폭 (스폰 확률 절반으로 감소)
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 0.9, height: baseSize * 0.9,
                speed: (Math.random() * 1.2 + 1.5 + gameState.stage * 0.25) * baseSpeed * destination.difficulty * 0.5, // 속도 절반으로 감소
                color: '#ff3300', type: 'kamikaze', hp: 1, maxHp: 1,
                goldValue: 8 + gameState.stage,
                aiType: 'kamikaze',
                targetX: 0, targetY: 0, // 플레이어 위치를 추적
                lastUpdate: Date.now()
            };
        } else if (enemyType < 0.4) {
            // 2. 부술 수 없는 총알 발사형 적: 일정 거리에서 멈춰서 2초마다 총알 발사
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 1.1, height: baseSize * 1.1,
                speed: (Math.random() * 1.0 + 1.2 + gameState.stage * 0.2) * baseSpeed * destination.difficulty * 0.5, // 속도 절반으로 감소
                color: '#cc0066', type: 'shooter_indestructible', 
                hp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                maxHp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                goldValue: 15 + gameState.stage * 2,
                aiType: 'shooter_indestructible',
                targetX: 0, targetY: 0,
                lastShot: 0,
                shotInterval: 2000, // 2초마다 발사
                stopDistance: 150 * gameScale, // 이 거리에서 멈춤
                hasStopped: false,
                lastUpdate: Date.now()
            };
        } else if (enemyType < 0.6) {
            // 3. 부술 수 있는 총알 발사형 적: 일정 거리에서 멈춰서 1초마다 총알 발사, 3초 후 맵 밖으로 나감
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 1.0, height: baseSize * 1.0,
                speed: (Math.random() * 1.1 + 1.3 + gameState.stage * 0.22) * baseSpeed * destination.difficulty * 0.5, // 속도 절반으로 감소
                color: '#9933ff', type: 'shooter_destructible', 
                hp: Math.ceil((1 + Math.floor(gameState.stage / 4)) * destination.difficulty),
                maxHp: Math.ceil((1 + Math.floor(gameState.stage / 4)) * destination.difficulty),
                goldValue: 12 + gameState.stage * 1.5,
                aiType: 'shooter_destructible',
                targetX: 0, targetY: 0,
                lastShot: 0,
                shotInterval: 1000, // 1초마다 발사
                stopDistance: 180 * gameScale, // 이 거리에서 멈춤
                hasStopped: false,
                stopTime: 0, // 멈춘 시간
                maxStopTime: 3000, // 최대 3초 동안 멈춤
                exitSpeed: 2 * baseSpeed, // 맵 밖으로 나가는 속도
                lastUpdate: Date.now()
            };
        } else if (enemyType < 0.8) {
            // 기존: 빠른 적
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 0.8, height: baseSize * 0.8,
                speed: (Math.random() * 2 + 2 + gameState.stage * 0.3) * baseSpeed * destination.difficulty * 0.5, // 속도 절반으로 감소
                color: '#ff00ff', type: 'fast', hp: 1, maxHp: 1,
                goldValue: 8 + gameState.stage,
                aiType: 'chase'
            };
        } else {
            // 기존: 강한 적
            enemy = {
                x: enemyX, y: enemyY, width: baseSize * 1.2, height: baseSize * 1.2,
                speed: (Math.random() * 1.2 + 0.8 + gameState.stage * 0.15) * baseSpeed * destination.difficulty * 0.5, // 속도 절반으로 감소
                color: '#ff0000', type: 'strong', 
                hp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                maxHp: Math.ceil((2 + Math.floor(gameState.stage / 3)) * destination.difficulty),
                goldValue: 12 + gameState.stage * 2,
                aiType: 'chase'
            };
        }
        
        enemies.push(enemy);
    }

    // ===== 보스 적 생성 함수들 =====
    // 분리된 전역 함수 사용 (js/enemies.js)
    const spawnBoss = window.spawnBoss;

    // 2스테이지 보스: 중순양함
    const spawnCruiserBoss = window.spawnCruiserBoss;

    // 3스테이지 이상 보스: 항공모함
    const spawnCarrierBoss = window.spawnCarrierBoss;

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
        
        // 스테이지 증가
        gameState.stage++;
        
        // 새로운 스테이지 미션 생성 및 표시
        showStageMission(gameState.stage);
        
        // 기존 선택 초기화
        gameState.selectedDestination = null;
        gameState.selectedCargos = [];
        gameState.damageLevel = 1;
        gameState.speedLevel = 1;
        gameState.turretCount = 1;
        gameState.score = 0;
        
        // 보스 상태 초기화
        gameState.bossSpawned = false;
        gameState.currentBoss = null;
        
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
        const intermission = document.getElementById('intermissionScreen');
        if (intermission) intermission.style.display = 'none';
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
            bullet.y += bullet.vy; // speed 대신 vy 사용
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
                playSound(200, 0.1);
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
            // 보스 적 특별 처리
            if (enemy.type === 'cruiser_boss') {
                updateCruiserBoss(enemy);
            } else if (enemy.type === 'carrier_boss') {
                updateCarrierBoss(enemy);
            } else {
                // 편대 경로 업데이트(있을 경우)
                if (enemy.type === 'formation' && window.tickFormationMovement) {
                    window.tickFormationMovement(enemy);
                }
                // 적의 색깔에 따라 AI 타입 결정
                if (enemy.color === '#ff3300') {
                    // 자폭형 적 (주황색)
                    updateKamikazeEnemy(enemy);
                } else if (enemy.color === '#cc0066') {
                    // 부술 수 없는 총알 발사형 적 (진한 분홍색)
                    updateShooterIndestructibleEnemy(enemy);
                } else if (enemy.color === '#9933ff') {
                    // 부술 수 있는 총알 발사형 적 (보라색)
                    updateShooterDestructibleEnemy(enemy);
                } else {
                    // 기존 일반 적 처리 (chase AI) - 빨간색, 분홍색
                    updateChaseEnemy(enemy);
                }
            }
            
            // 플레이어와 충돌 체크
            if (checkCollision(enemy, player)) {
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                playSound(200, 0.1);
                gameState.lives--;
                if (gameState.lives <= 0) {
                    gameState.gameOver = true;
                    showGameOver();
                }
                return false; // 충돌한 개체만 제거
            }
            
            return enemy.x > -100 && enemy.x < canvas.width + 100 && 
                   enemy.y > -100 && enemy.y < canvas.height + 100;
        });
    }

    

    // ===== 보스 적 업데이트 함수들 =====
    function updateCruiserBoss(boss) {
        const now = Date.now();
        
        // 좌우 이동 패턴
        if (boss.movePattern === 'horizontal') {
            const centerX = canvas.width / 2;
            const targetX = centerX + Math.sin(now * 0.001) * boss.moveRange;
            boss.x = targetX - boss.width / 2;
        }
        
        // 플레이어를 향해 천천히 하강
        if (boss.y < 100 * gameScale) {
            boss.y += boss.speed;
        }
        
        // 주기적으로 총알 발사
        if (now - boss.lastShot > boss.shotInterval) {
            spawnBossBullet(boss, 'cruiser');
            boss.lastShot = now;
        }
    }

    function updateCarrierBoss(boss) {
        const now = Date.now();
        
        // 고정 위치에서 천천히 하강
        if (boss.y < 120 * gameScale) {
            boss.y += boss.speed;
        }
        
        // 주기적으로 전투기 생성
        if (now - boss.lastShot > boss.shotInterval && boss.fighterSpawnCount < boss.maxFighters) {
            spawnFighterFromCarrier(boss);
            boss.lastShot = now;
            boss.fighterSpawnCount++;
        }
    }

    // 보스 총알 생성
    function spawnBossBullet(boss, bossType) {
        if (bossType === 'cruiser') {
            const bulletSpeed = 3 * gameScale;
            const dx = player.x + player.width/2 - (boss.x + boss.width/2);
            const dy = player.y + player.height/2 - (boss.y + boss.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // 공용 총알 함수 사용
                const bullet = createBullet(
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
                enemyBullets.push(bullet);
            }
        }
    }

    // 항공모함에서 전투기 생성
    function spawnFighterFromCarrier(carrier) {
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
            goldValue: 15 + gameState.stage * 3
        };
        
        enemies.push(fighter);
        playSound(500, 0.1);
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
                        playSound(300, 0.05);
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
                        playSound(300, 0.05);
                    }
                }
            });
        });

        // 플레이어 총알과 적 총알의 충돌 (부술 수 있는 총알만)
        bullets.forEach((bullet, bulletIndex) => {
            enemyBullets.forEach((enemyBullet, enemyBulletIndex) => {
                if (enemyBullet.type === 'destructible' && checkCollision(bullet, enemyBullet)) {
                    // 부술 수 있는 총알과 충돌 시 양쪽 총알 모두 제거
                    bullets.splice(bulletIndex, 1);
                    enemyBullets.splice(enemyBulletIndex, 1);
                    
                    // 작은 폭발 효과
                    createExplosion(bullet.x + bullet.width/2, bullet.y + bullet.height/2);
                    playSound(400, 0.1);
                }
            });
        });

        // 포탑 총알과 적 총알의 충돌 (부술 수 있는 총알만)
        turretBullets.forEach((bullet, bulletIndex) => {
            enemyBullets.forEach((enemyBullet, enemyBulletIndex) => {
                if (enemyBullet.type === 'destructible' && checkCollision(bullet, enemyBullet)) {
                    // 부술 수 있는 총알과 충돌 시 양쪽 총알 모두 제거
                    turretBullets.splice(bulletIndex, 1);
                    enemyBullets.splice(enemyBulletIndex, 1);
                    
                    // 작은 폭발 효과
                    createExplosion(bullet.x + bullet.width/2, bullet.y + bullet.height/2);
                    playSound(400, 0.1);
                }
            });
        });
    }

    function updateTurrets() {
        const now = Date.now();
        const fireRateBonus = getFireRateBonus();
        // 터렛 발사 빈도를 절반으로 줄임 (250 -> 500)
        const baseInterval = 500 / (1 + fireRateBonus / 100);
        
        // 일반형 적의 발생 빈도에 비례해서 터렛 발사 빈도 조정
        const enemyCount = enemies.length;
        const enemyDensity = Math.min(enemyCount / 10, 2); // 적 밀도 (최대 2배)
        const adjustedInterval = baseInterval / enemyDensity;
        
        player.turrets.forEach(turret => {
            if (now - turret.lastShot > adjustedInterval && enemies.length > 0) {
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
                    
                    // 공용 총알 함수 사용
                    const bullet = createBullet(
                        player.x + turret.x + player.width/2,
                        player.y + turret.y + player.height/2,
                        3 * gameScale,
                        3 * gameScale,
                        vx,
                        vy,
                        'turret',
                        '#00ff00',
                        turret.damage
                    );
                    turretBullets.push(bullet);
                    
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
        //ctx.fillStyle = '#ffffff';
        //ctx.fillRect(player.x + player.width * 0.4, player.y + player.height * 0.1,player.width * 0.2, player.height * 0.3);

        // 포탑들
        ctx.fillStyle = '#00ff00';
        player.turrets.forEach(turret => {
            ctx.fillRect(player.x + turret.x + player.width/2 - 3*gameScale,
                        player.y + turret.y + player.height/2 - 3*gameScale,
                        6*gameScale, 6*gameScale);
        });

        // 터렛 사정거리 경계선을 원으로 표시
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2 * gameScale;
        ctx.setLineDash([5 * gameScale, 5 * gameScale]);
        player.turrets.forEach(turret => {
            ctx.beginPath();
            ctx.arc(player.x + turret.x + player.width/2, 
                   player.y + turret.y + player.height/2, 
                   300 * gameScale, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.setLineDash([]); // 점선 해제

        ctx.restore();
    }

    // ===== 공용 총알 함수들 =====
    function createBullet(x, y, width, height, vx, vy, type, color, damage = 1) {
        return {
            x: x,
            y: y,
            width: width,
            height: height,
            vx: vx,
            vy: vy,
            type: type,
            color: color,
            damage: damage
        };
    }
    
    function drawBullet(bullet, ctx) {
        if (bullet.type === 'indestructible') {
            // 부술 수 없는 총알: 붉은 외곽 + 노란 내부 (항상 동일하게 표시)
            const outerColor = '#8B0000'; // 매우 붉은색
            const innerColor = '#FFFF00'; // 노란색
            const cx = bullet.x + bullet.width / 2;
            const cy = bullet.y + bullet.height / 2;
            const rOuter = Math.max(1, bullet.width / 2);
            const rInner = Math.max(0.5, bullet.width / 3);

            ctx.fillStyle = outerColor;
            ctx.beginPath();
            ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = innerColor;
            ctx.beginPath();
            ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
            ctx.fill();
        } else if (bullet.type === 'destructible') {
            // 부술 수 있는 총알: 적의 색깔과 동일하게 표시
            ctx.fillStyle = bullet.color || '#9933ff';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else if (bullet.type === 'player') {
            // 플레이어 총알: 노란색
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else if (bullet.type === 'turret') {
            // 포탑 총알: 초록색
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        } else {
            // 기본 총알: 빨간색
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }

    function drawBullets() {
        // 플레이어 총알
        bullets.forEach(bullet => {
            bullet.type = 'player'; // 타입 설정
            drawBullet(bullet, ctx);
        });
        
        // 포탑 총알
        turretBullets.forEach(bullet => {
            bullet.type = 'turret'; // 타입 설정
            drawBullet(bullet, ctx);
        });
        
        // 적 총알 (공용 총알 함수 사용)
        enemyBullets.forEach(bullet => {
            drawBullet(bullet, ctx);
        });
    }

    function drawEnemies() {
        enemies.forEach(enemy => {
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // 보스 적 특별 그리기
            if (enemy.type === 'cruiser_boss') {
                drawCruiserBoss(enemy);
            } else if (enemy.type === 'carrier_boss') {
                drawCarrierBoss(enemy);
            } else {
                // 일반 적 그리기
                ctx.fillStyle = enemy.color;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }

            // 체력바 그리기
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

    // ===== 보스 적 그리기 함수들 =====
    function drawCruiserBoss(boss) {
        // 중순양함 본체
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // 중순양함 디테일
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(boss.x + boss.width * 0.3, boss.y + boss.height * 0.2, boss.width * 0.4, boss.height * 0.3);
        
        // 포탑들
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(boss.x + boss.width * 0.1, boss.y + boss.height * 0.1, boss.width * 0.15, boss.height * 0.2);
        ctx.fillRect(boss.x + boss.width * 0.75, boss.y + boss.height * 0.1, boss.width * 0.15, boss.height * 0.2);
        
        // 보스 표시
        ctx.fillStyle = '#ff00ff';
        ctx.font = `${12 * gameScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', boss.x + boss.width / 2, boss.y - 10);
    }

    function drawCarrierBoss(boss) {
        // 항공모함 본체
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // 항공모함 디테일
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(boss.x + boss.width * 0.2, boss.y + boss.height * 0.3, boss.width * 0.6, boss.height * 0.4);
        
        // 비행기 격납고
        ctx.fillStyle = '#00ffff';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(boss.x + boss.width * 0.25 + i * boss.width * 0.2, 
                        boss.y + boss.height * 0.1, boss.width * 0.1, boss.height * 0.2);
        }
        
        // 보스 표시
        ctx.fillStyle = '#ff00ff';
        ctx.font = `${12 * gameScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('CARRIER', boss.x + boss.width / 2, boss.y - 10);
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
        ctx.fillStyle = gameState.stageTimer <= 10 ? '#ff0000' : 'white';
        ctx.fillText(`생명: ${gameState.lives}`, 10, 65);
        ctx.fillText(`시간: ${gameState.stageTimer}s`, 10, 85);
        
        // 우주선 속도 효과 표시
        const destination = DESTINATIONS[gameState.selectedDestination];
        if (destination) {
            const baseTime = destination.time;
            const timeSaved = baseTime - gameState.stageTimer;
            if (timeSaved > 0) {
                ctx.fillStyle = '#00ff00';
                ctx.font = `${10 * gameScale}px Arial`;
                ctx.fillText(`⚡ 속도 효과: ${Math.round((timeSaved / baseTime) * 100)}% 단축`, 10, 105);
            }
        }
        
        // 시간 압박 효과 표시
        const timePressure = Math.max(0, (120 - gameState.stageTimer) / 120);
        if (timePressure > 0.3) {
            const intensity = Math.min(255, timePressure * 255);
            ctx.fillStyle = `rgb(${intensity}, 0, 0)`;
            ctx.font = `${14 * gameScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`⚠️ 시간 압박! 적 스폰 ${Math.round(timePressure * 200)}% 증가`, canvas.width / 2, 30);
            ctx.textAlign = 'left';
        }
        
        // 보스 상태 표시
        if (gameState.currentBoss) {
            ctx.fillStyle = '#ff00ff';
            ctx.font = `${16 * gameScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`🚨 보스 출현! ${gameState.currentBoss.type === 'cruiser_boss' ? '중순양함' : '항공모함'}`, canvas.width / 2, 60);
            ctx.textAlign = 'left';
        }

        // 적의 색깔에 따른 AI 타입 정보 표시 (우측 상단)
        ctx.fillStyle = '#ffffff';
        ctx.font = `${10 * gameScale}px Arial`;
        ctx.textAlign = 'right';
        
        let infoY = 25;
        ctx.fillText(`🟠 주황색: 자폭형 적 (플레이어를 향해 직진)`, canvas.width - 10, infoY);
        infoY += 20;
        ctx.fillText(`🔴 진한 분홍색: 부술 수 없는 총알 (2초마다 발사)`, canvas.width - 10, infoY);
        infoY += 20;
        ctx.fillText(`🟣 보라색: 부술 수 있는 총알 (1초마다 발사, 3초 후 퇴장)`, canvas.width - 10, infoY);
        infoY += 20;
        ctx.fillText(`🔴 빨간색/분홍색: 일반 추적형 적`, canvas.width - 10, infoY);
        
        ctx.textAlign = 'left';
    }

    // ===== 스테이지별 랜덤 미션 생성 함수 =====
    function generateStageMission(stage) {
        const availableDestinations = Object.keys(DESTINATIONS);
        const availableCargos = Object.keys(CARGO_TYPES);
        
        // 스테이지에 따라 목적지 언락
        let unlockedDestinations = [];
        if (stage >= 1) {
            unlockedDestinations.push('nearby', 'medium'); // 1스테이지: 2개 기본 언락
        }
        if (stage >= 2) {
            unlockedDestinations.push('far'); // 2스테이지: 원거리 행성 언락
        }
        if (stage >= 3) {
            unlockedDestinations.push('dangerous'); // 3스테이지: 위험 지역 언락
        }
        if (stage >= 4) {
            unlockedDestinations.push('asteroid'); // 4스테이지: 소행성 벨트 언락
        }
        if (stage >= 5) {
            unlockedDestinations.push('nebula'); // 5스테이지: 성운 지대 언락
        }
        if (stage >= 6) {
            unlockedDestinations.push('wormhole'); // 6스테이지: 웜홀 입구 언락
        }
        if (stage >= 7) {
            unlockedDestinations.push('blackhole'); // 7스테이지: 블랙홀 근처 언락
        }
        
        // 목적지 선택 (언락된 것들 중에서만)
        const destinationKey = unlockedDestinations[Math.floor(Math.random() * unlockedDestinations.length)];
        
        // 화물 선택 (스테이지에 따라 특별한 화물이 나올 확률 증가)
        const selectedCargos = [];
        const maxCargoSlots = getMaxCargoSlots();
        const cargoCount = Math.min(maxCargoSlots, Math.floor(stage / 3) + 1);
        
        // 스테이지가 높을수록 특별한 화물이 나올 확률 증가
        const specialCargoChance = Math.min(0.3 + (stage - 1) * 0.05, 0.8);
        
        for (let i = 0; i < cargoCount; i++) {
            let cargoKey;
            if (Math.random() < specialCargoChance && stage > 3) {
                // 특별한 화물 (새로 추가된 것들)
                const specialCargos = ['quantum', 'plasma', 'crystal', 'nanotech', 'antimatter', 'darkmatter'];
                cargoKey = specialCargos[Math.floor(Math.random() * specialCargos.length)];
            } else {
                // 일반 화물
                cargoKey = availableCargos[Math.floor(Math.random() * availableCargos.length)];
            }
            
            // 중복 방지
            if (!selectedCargos.includes(cargoKey)) {
                selectedCargos.push(cargoKey);
            }
        }
        
        return {
            destination: destinationKey,
            cargos: selectedCargos,
            stage: stage,
            unlockedDestinations: unlockedDestinations
        };
    }

    // ===== 스테이지별 미션 표시 함수 =====
    function showStageMission(stage) {
        const mission = generateStageMission(stage);
        
        // 미션 정보 표시
        const missionInfo = document.getElementById('stageMissionInfo');
        if (missionInfo) {
            const destination = DESTINATIONS[mission.destination];
            const cargoNames = mission.cargos.map(key => CARGO_TYPES[key].name).join(', ');
            
            missionInfo.innerHTML = `
                <div class="mission-header">
                    <h3>🎯 스테이지 ${stage} 미션</h3>
                    <div class="mission-destination">
                        <strong>목적지:</strong> ${destination.name}
                    </div>
                    <div class="mission-cargos">
                        <strong>권장 화물:</strong> ${cargoNames}
                    </div>
                    <div class="mission-reward">
                        <strong>예상 보상:</strong> 💰 ${Math.floor(stage * 15 * destination.goldMultiplier)} 골드, 💎 ${Math.floor(stage * 8 * destination.diamondMultiplier)} 다이아
                    </div>
                    <div class="mission-unlock" style="margin-top: 8px; padding: 6px; background: rgba(0, 255, 0, 0.1); border-radius: 4px; font-size: 10px; color: #0f0;">
                        <strong>🔓 언락된 목적지:</strong> ${mission.unlockedDestinations.length}/8개
                    </div>
                </div>
            `;
            missionInfo.style.display = 'block';
        }
        
        // 자동으로 미션 제안 선택
        gameState.selectedDestination = mission.destination;
        gameState.selectedCargos = [...mission.cargos];
        
        // UI 업데이트
        document.querySelectorAll('[data-destination]').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector('[data-destination="' + mission.destination + '"]').classList.add('selected');
        
        document.querySelectorAll('[data-cargo]').forEach(card => {
            card.classList.remove('selected');
        });
        mission.cargos.forEach(cargoKey => {
            document.querySelector('[data-cargo="' + cargoKey + '"]').classList.add('selected');
        });
        
        // 정보 표시 업데이트
        const dest = DESTINATIONS[mission.destination];
        document.getElementById('destinationInfo').style.display = 'block';
        document.getElementById('selectedDestName').textContent = dest.name;
        document.getElementById('selectedDestDesc').textContent = dest.description;
        document.getElementById('selectedDestDetails').textContent = dest.details;
        
        updateStartButton();
        updateCargoSlotDisplay();
        
        // 목적지 카드들의 언락 상태 업데이트
        updateDestinationUnlockStatus(stage);
    }

    // ===== 목적지 언락 상태 업데이트 함수 =====
    function updateDestinationUnlockStatus(stage) {
        const allDestinations = document.querySelectorAll('[data-destination]');
        
        allDestinations.forEach(card => {
            const destKey = card.getAttribute('data-destination');
            let isUnlocked = false;
            
            // 스테이지별 언락 조건
            switch(destKey) {
                case 'nearby':
                case 'medium':
                    isUnlocked = stage >= 1;
                    break;
                case 'far':
                    isUnlocked = stage >= 2;
                    break;
                case 'dangerous':
                    isUnlocked = stage >= 3;
                    break;
                case 'asteroid':
                    isUnlocked = stage >= 4;
                    break;
                case 'nebula':
                    isUnlocked = stage >= 5;
                    break;
                case 'wormhole':
                    isUnlocked = stage >= 6;
                    break;
                case 'blackhole':
                    isUnlocked = stage >= 7;
                    break;
            }
            
            if (isUnlocked) {
                card.classList.remove('locked');
                card.style.opacity = '1';
                card.style.filter = 'none';
                card.onclick = () => selectDestination(destKey);
                
                // 언락된 카드에 특별한 효과 추가
                if (stage === 1 && (destKey === 'nearby' || destKey === 'medium')) {
                    card.style.borderColor = '#00ff00';
                    card.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.3)';
                } else if (stage === 2 && destKey === 'far') {
                    card.style.borderColor = '#ffaa00';
                    card.style.boxShadow = '0 0 10px rgba(255, 170, 0, 0.3)';
                } else if (stage === 3 && destKey === 'dangerous') {
                    card.style.borderColor = '#ff6600';
                    card.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.3)';
                } else if (stage === 4 && destKey === 'asteroid') {
                    card.style.borderColor = '#ff8000';
                    card.style.boxShadow = '0 0 10px rgba(255, 128, 0, 0.3)';
                } else if (stage === 5 && destKey === 'nebula') {
                    card.style.borderColor = '#ff6600';
                    card.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.3)';
                } else if (stage === 6 && destKey === 'wormhole') {
                    card.style.borderColor = '#ff0000';
                    card.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.3)';
                } else if (stage === 7 && destKey === 'blackhole') {
                    card.style.borderColor = '#800000';
                    card.style.boxShadow = '0 0 10px rgba(128, 0, 0, 0.3)';
                }
            } else {
                card.classList.add('locked');
                card.style.opacity = '0.5';
                card.style.filter = 'grayscale(100%)';
                card.onclick = null;
                card.style.cursor = 'not-allowed';
                
                // 잠긴 카드에 잠금 표시 추가
                const lockIcon = card.querySelector('.lock-icon');
                if (!lockIcon) {
                    const lockDiv = document.createElement('div');
                    lockDiv.className = 'lock-icon';
                    lockDiv.innerHTML = '🔒';
                    lockDiv.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 16px; color: #ff0000; text-shadow: 0 0 5px #ff0000;';
                    card.style.position = 'relative';
                    card.appendChild(lockDiv);
                }
                
                // 언락 조건 표시
                let unlockCondition = '';
                switch(destKey) {
                    case 'far': unlockCondition = '스테이지 2 필요'; break;
                    case 'dangerous': unlockCondition = '스테이지 3 필요'; break;
                    case 'asteroid': unlockCondition = '스테이지 4 필요'; break;
                    case 'nebula': unlockCondition = '스테이지 5 필요'; break;
                    case 'wormhole': unlockCondition = '스테이지 6 필요'; break;
                    case 'blackhole': unlockCondition = '스테이지 7 필요'; break;
                }
                
                const conditionText = card.querySelector('.unlock-condition');
                if (!conditionText) {
                    const conditionDiv = document.createElement('div');
                    conditionDiv.className = 'unlock-condition';
                    conditionDiv.innerHTML = unlockCondition;
                    conditionDiv.style.cssText = 'position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); font-size: 9px; color: #ff0000; font-weight: bold; text-shadow: 0 0 3px #ff0000;';
                    card.appendChild(conditionDiv);
                }
            }
        });
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
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
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
        
        // 첫 번째 스테이지 미션 표시
        showStageMission(1);
    });

    // ===== 적 AI 업데이트 함수들 =====
    // js/enemy_ai.js의 전역 함수들 사용
    const updateKamikazeEnemy = window.updateKamikazeEnemy;
    const updateShooterIndestructibleEnemy = window.updateShooterIndestructibleEnemy;
    const updateShooterDestructibleEnemy = window.updateShooterDestructibleEnemy;
    const updateChaseEnemy = window.updateChaseEnemy;

    // ===== 전역 함수 노출 =====
    window.startGame = startGame;
    window.selectDestination = selectDestination;
    window.selectCargo = selectCargo;
    window.showDiamondShop = showDiamondShop;
    window.closeDiamondShop = closeDiamondShop;
    window.confirmPurchase = confirmPurchase;
    window.closePurchaseModal = closePurchaseModal;
    window.executePurchase = executePurchase;
    window.upgradeDamage = upgradeDamage;
    window.upgradeSpeed = upgradeSpeed;
    window.addTurret = addTurret;
    window.returnToPrep = returnToPrep;
    window.toggleDiamondUpgrades = toggleDiamondUpgrades;
