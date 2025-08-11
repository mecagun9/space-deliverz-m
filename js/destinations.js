// 목적지 데이터 분리 (전역에 등록)
window.DESTINATIONS = {
    nearby: {
        name: '🌍 근거리 행성',
        description: '안전하지만 보상이 적습니다.',
        time: 75,
        difficulty: 1,
        goldMultiplier: 1,
        diamondMultiplier: 1,
        details: '⭐ 위험도: 낮음 | 적 속도: 보통 | 적 체력: 1'
    },
    medium: {
        name: '🪐 중거리 행성',
        description: '적당한 위험과 보상입니다.',
        time: 90,
        difficulty: 1.5,
        goldMultiplier: 1.2,
        diamondMultiplier: 1.2,
        details: '⭐⭐ 위험도: 중간 | 적 속도: 빠름 | 적 체력: 1-2'
    },
    far: {
        name: '🌌 원거리 행성',
        description: '위험하지만 보상이 좋습니다.',
        time: 120,
        difficulty: 2,
        goldMultiplier: 1.5,
        diamondMultiplier: 1.5,
        details: '⭐⭐⭐ 위험도: 높음 | 적 속도: 매우 빠름 | 적 체력: 2-3'
    },
    dangerous: {
        name: '⚠️ 위험 지역',
        description: '매우 위험하지만 최고의 보상!',
        time: 150,
        difficulty: 3,
        goldMultiplier: 2,
        diamondMultiplier: 2,
        details: '⭐⭐⭐⭐ 위험도: 매우 높음 | 적 속도: 극한 | 적 체력: 3-5'
    },
    asteroid: {
        name: '☄️ 소행성 벨트',
        description: '소행성들이 가득한 위험한 구역입니다.',
        time: 100,
        difficulty: 2.5,
        goldMultiplier: 1.8,
        diamondMultiplier: 1.8,
        details: '⭐⭐⭐⭐ 위험도: 매우 높음 | 적 속도: 극한 | 적 체력: 3-4'
    },
    nebula: {
        name: '🌫️ 성운 지대',
        description: '신비로운 에너지가 가득한 지역입니다.',
        time: 130,
        difficulty: 2.2,
        goldMultiplier: 1.6,
        diamondMultiplier: 1.6,
        details: '⭐⭐⭐ 위험도: 높음 | 적 속도: 빠름 | 적 체력: 2-3'
    },
    blackhole: {
        name: '🕳️ 블랙홀 근처',
        description: '시공간이 뒤틀린 극한의 위험 지역!',
        time: 180,
        difficulty: 4,
        goldMultiplier: 3,
        diamondMultiplier: 3,
        details: '⭐⭐⭐⭐⭐ 위험도: 극한 | 적 속도: 극한 | 적 체력: 4-6'
    },
    wormhole: {
        name: '🌀 웜홀 입구',
        description: '차원을 넘나드는 신비로운 통로입니다.',
        time: 140,
        difficulty: 2.8,
        goldMultiplier: 2.2,
        diamondMultiplier: 2.2,
        details: '⭐⭐⭐⭐ 위험도: 매우 높음 | 적 속도: 극한 | 적 체력: 3-5'
    }
};


