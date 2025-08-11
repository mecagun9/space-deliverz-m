// 화물 데이터 분리 (전역에 등록)
window.CARGO_TYPES = {
    military: { name: '군사 물자', damageBonus: 0.5, enemySpawnRate: 1.3, reward: 15 },
    medical: { name: '의료 용품', bonusLife: 1, speedPenalty: 0.1, reward: 10 },
    energy: { name: '에너지 셀', fireRateBonus: 0.3, reward: 12 },
    luxury: { name: '고급품', diamondBonus: 1, speedPenalty: 0.2, reward: 25 },
    tech: { name: '기술 부품', turretAccuracy: 0.25, reward: 18 },
    fuel: { name: '연료', speedBonus: 0.2, reward: 8 },
    food: { name: '식량', effects: {}, reward: 20, goldReward: true },
    art: { name: '예술품', effects: {}, reward: 15, diamondReward: true },
    // 새로운 화물들
    quantum: { name: '양자 물질', damageBonus: 0.8, fireRateBonus: 0.5, reward: 30 },
    plasma: { name: '플라즈마', damageBonus: 0.3, speedBonus: 0.3, reward: 22 },
    crystal: { name: '크리스탈', diamondBonus: 2, reward: 35, diamondReward: true },
    nanotech: { name: '나노 기술', turretAccuracy: 0.4, fireRateBonus: 0.4, reward: 28 },
    antimatter: { name: '반물질', damageBonus: 1.0, speedPenalty: 0.3, reward: 40 },
    darkmatter: { name: '암흑 물질', diamondBonus: 3, speedPenalty: 0.4, reward: 45, diamondReward: true }
};


