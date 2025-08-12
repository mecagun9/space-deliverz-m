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

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.STAGE_3_DATA = STAGE_3_DATA;
}
