// 2스테이지: 중거리 (화성, 목성 등)
const STAGE_2_DATA = {
    name: "중거리",
    difficulty: 1.5,
    enemyTypes: [
        {
            name: "kamikaze",
            color: "#ff3300",
            spawnRate: 0.15,
            hp: 1,
            speed: 1.8,
            goldValue: 9,
            aiType: "kamikaze"
        },
        {
            name: "shooter_indestructible",
            color: "#cc0066",
            spawnRate: 0.25,
            hp: 3,
            speed: 1.4,
            goldValue: 17,
            aiType: "shooter_indestructible",
            shotInterval: 1800,
            stopDistance: 160
        },
        {
            name: "shooter_destructible",
            color: "#9933ff",
            spawnRate: 0.25,
            hp: 2,
            speed: 1.5,
            goldValue: 14,
            aiType: "shooter_destructible",
            shotInterval: 900,
            stopDistance: 190,
            maxStopTime: 2800
        },
        {
            name: "fast",
            color: "#ff00ff",
            spawnRate: 0.15,
            hp: 1,
            speed: 2.3,
            goldValue: 9,
            aiType: "chase"
        },
        {
            name: "strong",
            color: "#ff0000",
            spawnRate: 0.2,
            hp: 3,
            speed: 1.0,
            goldValue: 14,
            aiType: "chase"
        }
    ],
    formations: [
        "pattern_1_horizontal_down",
        "vee_small",
        "line_left_to_right",
        "down_wave",
        "zigzag"
    ],
    boss: {
        type: "cruiser",
        name: "중순양함",
        hp: 60,
        speed: 0.6,
        shotInterval: 1800,
        movePattern: "horizontal",
        moveRange: 250
    }
};

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.STAGE_2_DATA = STAGE_2_DATA;
}
