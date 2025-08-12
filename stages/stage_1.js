// 1스테이지: 근거리 (달, 지구 궤도 등)
const STAGE_1_DATA = {
    name: "근거리",
    difficulty: 1.0,
    enemyTypes: [
        {
            name: "kamikaze",
            color: "#ff3300",
            spawnRate: 0.2,
            hp: 1,
            speed: 1.5,
            goldValue: 8,
            aiType: "kamikaze"
        },
        {
            name: "shooter_indestructible",
            color: "#cc0066",
            spawnRate: 0.2,
            hp: 2,
            speed: 1.2,
            goldValue: 15,
            aiType: "shooter_indestructible",
            shotInterval: 2000,
            stopDistance: 150
        },
        {
            name: "shooter_destructible",
            color: "#9933ff",
            spawnRate: 0.2,
            hp: 1,
            speed: 1.3,
            goldValue: 12,
            aiType: "shooter_destructible",
            shotInterval: 1000,
            stopDistance: 180,
            maxStopTime: 3000
        },
        {
            name: "fast",
            color: "#ff00ff",
            spawnRate: 0.2,
            hp: 1,
            speed: 2.0,
            goldValue: 8,
            aiType: "chase"
        },
        {
            name: "strong",
            color: "#ff0000",
            spawnRate: 0.2,
            hp: 2,
            speed: 0.8,
            goldValue: 12,
            aiType: "chase"
        }
    ],
    formations: [
        "pattern_1_horizontal_down",
        "vee_small",
        "column_down"
    ],
    boss: null
};

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.STAGE_1_DATA = STAGE_1_DATA;
}
