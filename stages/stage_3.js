// 3스테이지: 원거리 (토성, 천왕성, 해왕성 등)
const STAGE_3_DATA = {
    name: "원거리",
    difficulty: 2.0,
    enemyTypes: [
        {
            name: "kamikaze",
            color: "#ff3300",
            spawnRate: 0.1,
            hp: 2,
            speed: 2.0,
            goldValue: 10,
            aiType: "kamikaze"
        },
        {
            name: "shooter_indestructible",
            color: "#cc0066",
            spawnRate: 0.3,
            hp: 4,
            speed: 1.6,
            goldValue: 20,
            aiType: "shooter_indestructible",
            shotInterval: 1600,
            stopDistance: 170
        },
        {
            name: "shooter_destructible",
            color: "#9933ff",
            spawnRate: 0.3,
            hp: 3,
            speed: 1.7,
            goldValue: 16,
            aiType: "shooter_destructible",
            shotInterval: 800,
            stopDistance: 200,
            maxStopTime: 2600
        },
        {
            name: "fast",
            color: "#ff00ff",
            spawnRate: 0.15,
            hp: 2,
            speed: 2.5,
            goldValue: 10,
            aiType: "chase"
        },
        {
            name: "strong",
            color: "#ff0000",
            spawnRate: 0.15,
            hp: 4,
            speed: 1.2,
            goldValue: 16,
            aiType: "chase"
        }
    ],
    formations: [
        "pattern_1_horizontal_down",
        "vee_small",
        "line_left_to_right",
        "down_wave",
        "zigzag",
        "arc_down"
    ],
    boss: {
        type: "carrier",
        name: "항공모함",
        hp: 95,
        speed: 0.4,
        shotInterval: 1200,
        maxFighters: 7,
        fighterSpawnInterval: 1000
    }
};

// 새로운 모듈화된 구조: 스테이지 3에서 출현하는 적 정의
const STAGE_3_ENEMIES = [
    { template: 'kamikaze', spawnRate: 0.1 },
    { template: 'shooter_indestructible', spawnRate: 0.3 },
    { template: 'shooter_destructible', spawnRate: 0.3 },
    { template: 'chase', spawnRate: 0.15 },
    { template: 'strong', spawnRate: 0.15 }
];

// 스테이지 3용 적 생성 함수
function createStage3Enemy(x, y, baseSize, baseSpeed, destination, gameState, gameScale) {
    // 스폰 확률에 따라 적 타입 선택
    const random = Math.random();
    let cumulativeRate = 0;
    let selectedEnemy = null;
    
    for (const enemy of STAGE_3_ENEMIES) {
        cumulativeRate += enemy.spawnRate;
        if (random <= cumulativeRate) {
            selectedEnemy = enemy;
            break;
        }
    }
    
    // 기본값으로 chase 적 선택
    if (!selectedEnemy) {
        selectedEnemy = { template: 'chase', spawnRate: 0.15 };
    }
    
    // js/enemies.js의 createEnemyFromTemplate 함수 사용
    return window.createEnemyFromTemplate(
        selectedEnemy.template,
        x, y, baseSize, baseSpeed, destination, gameState, gameScale
    );
}

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.STAGE_3_DATA = STAGE_3_DATA;
    window.STAGE_3_ENEMIES = STAGE_3_ENEMIES;
    window.createStage3Enemy = createStage3Enemy;
}
