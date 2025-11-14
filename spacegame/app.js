/**
 * 이미지를 비동기적으로 로드하는 함수
 * @param {string} path - 이미지 파일 경로
 * @returns {Promise<HTMLImageElement>} - 로드된 이미지 객체
 */
function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
  });
}

/**
 * 3. 별이 있는 우주 배경 패턴을 생성하는 함수 (실습 3번)
 * @param {number} width - 패턴 캔버스 너비
 * @param {number} height - 패턴 캔버스 높이
 * @param {number} starCount - 생성할 별의 개수
 * @returns {HTMLCanvasElement} - 별이 그려진 캔버스 (패턴 소스)
 */
function createStarfieldPattern(width, height, starCount) {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = width;
  patternCanvas.height = height;
  const pCtx = patternCanvas.getContext('2d');

  // 1. 진한 보라색 배경 (이미지와 유사하게)
  pCtx.fillStyle = '#2c004a';
  pCtx.fillRect(0, 0, width, height);

  // 2. 흰색 십자가 모양의 별 그리기
  pCtx.strokeStyle = 'white';
  pCtx.lineWidth = 0.5;

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 1 + 0.5; // 별 십자가 크기

    // 십자가(+) 그리기
    pCtx.beginPath();
    // 가로선
    pCtx.moveTo(x - size, y);
    pCtx.lineTo(x + size, y);
    // 세로선
    pCtx.moveTo(x, y - size);
    pCtx.lineTo(x, y + size);
    pCtx.stroke();
  }
  return patternCanvas;
}

/**
 * 2. 적군을 피라미드 형태로 배치하는 함수 (실습 2번)
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 * @param {HTMLCanvasElement} canvas - 캔버스 요소
 * @param {HTMLImageElement} enemyImg - 적군 이미지
 */
function createEnemies2(ctx, canvas, enemyImg) {
  // 실습 이미지와 유사한 피라미드 배치
  const ENEMY_ROWS_CONFIG = [7, 7, 5, 3, 1]; 
  const ENEMY_WIDTH = enemyImg.width;
  const ENEMY_HEIGHT = enemyImg.height;
  const PADDING = 10; // 적군 사이 간격
  const START_Y = 50; // 캔버스 상단에서 50px 아래부터 시작

  let y = START_Y;

  // 설정된 배열(ENEMY_ROWS_CONFIG)을 기반으로 한 줄씩 그림
  for (const enemyCount of ENEMY_ROWS_CONFIG) {
    // 1. 현재 줄의 총 너비 계산
    const rowWidth = (enemyCount * ENEMY_WIDTH) + ((enemyCount - 1) * PADDING);
    // 2. 현재 줄을 중앙에 배치하기 위한 시작 X 좌표 계산
    let x = (canvas.width - rowWidth) / 2;

    // 3. 해당 줄의 적군 그리기
    for (let i = 0; i < enemyCount; i++) {
      ctx.drawImage(enemyImg, x, y);
      x += ENEMY_WIDTH + PADDING; // 다음 적군 위치로 이동
    }
    
    y += ENEMY_HEIGHT + PADDING; // 다음 줄로 이동
  }
}


// --- 메인 실행 코드 ---
// 웹페이지의 모든 요소가 로드된 후 실행
window.onload = async () => {
  // 1. 'myCanvas' (큰 캔버스)를 가져옵니다.
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  // 2. 이미지 로드
  const heroImg = await loadTexture('assets/player.png');
  const enemyImg = await loadTexture('assets/enemyShip.png');

  // 3. 별이 있는 우주 배경 그리기 (실습 3번)
  // 200x200 크기의 캔버스에 별 30개를 그려서 패턴 소스로 사용
  const starPatternCanvas = createStarfieldPattern(200, 200, 30);
  // createPattern으로 반복되는 패턴 생성
  const bgPattern = ctx.createPattern(starPatternCanvas, 'repeat');
  
  ctx.fillStyle = bgPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. 플레이어 그리기
  const heroX = canvas.width / 2 - heroImg.width / 2;
  const heroY = canvas.height - heroImg.height - 30;
  ctx.drawImage(heroImg, heroX, heroY); // 메인 우주선

  // --- 실습 1번: 보조 우주선 2기 추가 ---
  const auxWidth = heroImg.width * 0.7; // 크기를 70%로 조절
  const auxHeight = heroImg.height * 0.7;
  const auxPadding = 10; // 메인 우주선과의 간격

  // 왼쪽 보조 우주선 (y좌표를 살짝 올려서 뒤에 있는 것처럼 배치)
  const leftAuxX = heroX - auxWidth - auxPadding;
  const leftAuxY = heroY + 15;
  ctx.drawImage(heroImg, leftAuxX, leftAuxY, auxWidth, auxHeight);

  // 오른쪽 보조 우주선
  const rightAuxX = heroX + heroImg.width + auxPadding;
  const rightAuxY = leftAuxY; // y좌표 동일
  ctx.drawImage(heroImg, rightAuxX, rightAuxY, auxWidth, auxHeight);
  // --- 실습 1번 끝 ---


  // 5. 적군 그리기 (실습 2번)
  // 기존 createEnemies() 대신 createEnemies2() 호출
  createEnemies2(ctx, canvas, enemyImg);
};