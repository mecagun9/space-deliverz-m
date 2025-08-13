// 스테이지 데이터 통합 인덱스
const STAGES = {
    1: STAGE_1_DATA,
    2: STAGE_2_DATA,
    3: STAGE_3_DATA
};

// 스테이지별 적 생성 함수
function createEnemyFromStageData(stageNumber, enemyType, x, y) {
    const stageData = STAGES[stageNumber];
    if (!stageData || !stageData.enemyTypes) return null;
    
    const enemyDef = stageData.enemyTypes.find(e => e.name === enemyType);
    if (!enemyDef) return null;
    
    const gameScale = window.gameScale || 1;
    const baseSize = 25 * gameScale * 1.5; // 1.5배 크기
    
    return {
        x: x,
        y: y,
        width: baseSize,
        height: baseSize,
        speed: enemyDef.speed * gameScale * 0.5, // 절반 속도
        color: enemyDef.color,
        type: enemyDef.name,
        hp: enemyDef.hp,
        maxHp: enemyDef.hp,
        goldValue: enemyDef.goldValue + (stageNumber - 1) * 2,
        aiType: enemyDef.aiType,
        // 총알 발사형 적의 경우 추가 속성
        ...(enemyDef.shotInterval && { shotInterval: enemyDef.shotInterval }),
        ...(enemyDef.stopDistance && { stopDistance: enemyDef.stopDistance * gameScale }),
        ...(enemyDef.maxStopTime && { maxStopTime: enemyDef.maxStopTime }),
        // 기본값 설정
        lastShot: 0,
        hasStopped: false,
        lastUpdate: Date.now()
    };
}

// 스테이지별 편대 생성 함수
function getStageFormations(stageNumber) {
    const stageData = STAGES[stageNumber];
    return stageData?.formations || [];
}

// 스테이지별 보스 정보 반환
function getStageBoss(stageNumber) {
    const stageData = STAGES[stageNumber];
    return stageData?.boss || null;
}

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.STAGES = STAGES;
    window.createEnemyFromStageData = createEnemyFromStageData;
    window.getStageFormations = getStageFormations;
    window.getStageBoss = getStageBoss;
}
