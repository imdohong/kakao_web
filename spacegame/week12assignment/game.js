// =====================
// 메시지 상수
// =====================
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",

  KEY_EVENT_SPACE_DOWN: "KEY_EVENT_SPACE_DOWN",
  KEY_EVENT_SPACE_UP: "KEY_EVENT_SPACE_UP",

  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",

  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER", // 아군 레이저가 적을 맞춤
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",   // 적 몸체가 아군을 맞춤
  COLLISION_BOSS_LASER_HERO: "COLLISION_BOSS_LASER_HERO", // 보스 레이저가 아군을 맞춤

  GAME_END_WIN: "GAME_END_WIN",
  GAME_END_LOSS: "GAME_END_LOSS",
};

// =====================
// EventEmitter (Pub/Sub)
// =====================
class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(message, listener) {
    if (!this.listeners[message]) this.listeners[message] = [];
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => {
        try { l(message, payload); } catch (e) { console.error(e); }
      });
    }
  }
  clear() {
    this.listeners = {};
  }
}

// =====================
// 전역 변수
// =====================
let canvas, ctx;
let heroImg, enemyImg, laserImg, laserShotImg, lifeImg, ufoImg;
let gameObjects = [];
let hero = null;
let leftSidekick = null;
let rightSidekick = null;
let eventEmitter = new EventEmitter();
let gameLoopId = null;
let gameOver = false;

// 스테이지 관련 변수
let stage = 1;
const MAX_STAGE = 2; // 2스테이지가 보스전

// =====================
// 이미지 로더
// =====================
function loadTexture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image: " + src));
    img.src = src;
  });
}

// =====================
// GameObject (기본)
// =====================
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
    this.intervalIds = [];
  }

  registerInterval(id) {
    this.intervalIds.push(id);
  }

  destroy() {
    this.dead = true;
    this.intervalIds.forEach((id) => clearInterval(id));
    this.intervalIds = [];
  }

  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }

  draw(ctx) {
    if (this.img) {
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    } else {
      // 이미지가 없을 경우 기본 사각형
      ctx.fillStyle = this.type === "Enemy" ? "red" : "blue";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    // Override in subclasses
  }
}

// =====================
// Hero (플레이어)
// =====================
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.cooldown = 0;
    this.charging = false;
    this.charge = 0;
    this.chargeInterval = null;
    this.life = 3;
    this.points = 0;
  }

  fire() {
    if (this.canFire() && !gameOver) {
      const lx = Math.floor(this.x + this.width / 2 - 5);
      gameObjects.push(new Laser(lx, this.y - 10));
      this.cooldown = 200;

      const id = setInterval(() => {
        this.cooldown -= 100;
        if (this.cooldown <= 0) {
          this.cooldown = 0;
          clearInterval(id);
        }
      }, 100);
      this.registerInterval(id);
    }
  }

  startCharge() {
    if (this.charging) return;
    this.charging = true;
    this.charge = 0;
    const id = setInterval(() => {
      this.charge += 0.1;
      if (this.charge >= 1.5) this.charge = 1.5;
    }, 100);
    this.chargeInterval = id;
    this.registerInterval(id);
  }

  stopCharge() {
    if (this.charging) {
      clearInterval(this.chargeInterval);
      this.charging = false;
      if (this.charge >= 0.5) {
        this.fireChargeShot(this.charge);
      } else {
        this.fire();
      }
      this.charge = 0;
    }
  }

  fireChargeShot(power) {
    if (gameOver) return;
    const lx = Math.floor(this.x + this.width / 2 - (25 + power * 25) / 2);
    gameObjects.push(new ChargeLaser(lx, this.y - 40, power));
  }

  canFire() {
    return this.cooldown <= 0;
  }

  decrementLife() {
    this.life--;
    if (this.life <= 0) {
      this.destroy();
    }
  }

  incrementPoints(amount = 100) {
    this.points += amount;
  }
}

// =====================
// Enemy (일반 적)
// =====================
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    this.img = enemyImg;

    const moveInterval = setInterval(() => {
      if (this.dead) {
        clearInterval(moveInterval);
        return;
      }
      if (this.y < canvas.height - this.height) {
        this.y += 3;
      } else {
        clearInterval(moveInterval);
      }
    }, 50);

    this.registerInterval(moveInterval);
  }
}

// =====================
// Boss (보스 UFO)
// =====================
class Boss extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 200;
    this.height = 120;
    this.type = "Boss";
    this.img = ufoImg;
    this.hp = 50;      // 보스 체력
    this.maxHp = 50;
    this.dx = 3;       // 이동 속도

    // 1. 이동 패턴 (좌우 왕복)
    const moveId = setInterval(() => {
      if (this.dead) return;
      this.x += this.dx;
      // 화면 벽에 닿으면 방향 전환
      if (this.x <= 0 || this.x + this.width >= canvas.width) {
        this.dx *= -1;
      }
    }, 20);
    this.registerInterval(moveId);

    // 2. 공격 패턴 (미사일 발사)
    const attackId = setInterval(() => {
      if (this.dead) return;
      // 보스 중앙 하단에서 발사
      const missile = new EnemyLaser(this.x + this.width / 2 - 5, this.y + this.height);
      gameObjects.push(missile);
    }, 1000); // 1초마다 공격
    this.registerInterval(attackId);
  }

  draw(ctx) {
    super.draw(ctx);
    // 보스 체력바 그리기
    const barWidth = this.width;
    const barHeight = 10;
    const x = this.x;
    const y = this.y - 20;

    // 배경(회색)
    ctx.fillStyle = "gray";
    ctx.fillRect(x, y, barWidth, barHeight);
    // 현재 체력(빨강)
    ctx.fillStyle = "red";
    const currentWidth = (this.hp / this.maxHp) * barWidth;
    ctx.fillRect(x, y, currentWidth, barHeight);
    
    // 테두리
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }
}

// =====================
// Laser (아군 레이저)
// =====================
class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "Laser";
    this.img = laserImg;

    const moveInterval = setInterval(() => {
      if (this.dead) {
        clearInterval(moveInterval);
        return;
      }
      if (this.y > -50) {
        this.y -= 12;
      } else {
        this.destroy();
        clearInterval(moveInterval);
      }
    }, 15);

    this.registerInterval(moveInterval);
  }
}

// =====================
// EnemyLaser (적/보스 레이저)
// =====================
class EnemyLaser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "EnemyLaser";
    // 이미지가 없으면 draw에서 사각형으로 그림

    const moveInterval = setInterval(() => {
      if (this.dead) {
        clearInterval(moveInterval);
        return;
      }
      if (this.y < canvas.height + 50) {
        this.y += 10; // 아래로 이동
      } else {
        this.destroy();
        clearInterval(moveInterval);
      }
    }, 15);

    this.registerInterval(moveInterval);
  }

  draw(ctx) {
    ctx.fillStyle = "#FFDD00"; // 노란색 레이저
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

// =====================
// ChargeLaser (차지샷)
// =====================
class ChargeLaser extends GameObject {
  constructor(x, y, power) {
    super(x, y);
    this.width = 25 + power * 25;
    this.height = 80 + power * 40;
    this.type = "ChargeLaser";
    this.power = power;
  }
  update() {
    this.y -= 20 + this.power * 10;
    if (this.y < -200) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = "rgba(255, 0, 8, 0.6)";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// =====================
// Sidekick (보조비행선)
// =====================
class Sidekick extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 50;
    this.height = 37;
    this.type = "Sidekick";
    this.img = heroImg;

    const autoId = setInterval(() => {
      if (this.dead) {
        clearInterval(autoId);
        return;
      }
      const s = new Laser(this.x + 20, this.y - 10);
      s.width = 5;
      s.height = 15;
      gameObjects.push(s);
    }, 500);

    this.registerInterval(autoId);
  }
}

// =====================
// Explosion (폭발 효과)
// =====================
class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 56;
    this.height = 54;
    this.type = "Explosion";
    this.img = laserShotImg;
    setTimeout(() => (this.dead = true), 200);
  }
}

// =====================
// 유틸리티 함수
// =====================
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function isHeroDead() {
  return hero && hero.life <= 0;
}

// 적이나 보스가 모두 죽었는지 확인
function isEnemiesDead() {
  const enemies = gameObjects.filter((go) => (go.type === "Enemy" || go.type === "Boss") && !go.dead);
  return enemies.length === 0;
}

function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// =====================
// 게임 흐름 관리
// =====================
function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function createSidekicks() {
  leftSidekick = new Sidekick(hero.x - 60, hero.y + 20);
  rightSidekick = new Sidekick(hero.x + 110, hero.y + 20);
  gameObjects.push(leftSidekick, rightSidekick);
}

// [수정됨] 스테이지별 적 생성
function createEnemies() {
  if (stage === MAX_STAGE) {
    // === 보스 스테이지 ===
    // 화면 중앙 상단에 보스 배치
    const boss = new Boss(canvas.width / 2 - 100, 50);
    gameObjects.push(boss);
  } else {
    // === 일반 스테이지 ===
    const MONSTER_TOTAL = 5;
    const MONSTER_WIDTH = MONSTER_TOTAL * 98;
    const START_X = (canvas.width - MONSTER_WIDTH) / 2;
    const STOP_X = START_X + MONSTER_WIDTH;

    for (let x = START_X; x < STOP_X; x += 98) {
      for (let y = 0; y < 50 * (stage + 2); y += 50) { // 스테이지가 높을수록 줄 수 증가
        const enemy = new Enemy(x, y);
        enemy.img = enemyImg;
        gameObjects.push(enemy);
      }
    }
  }
}

function nextStage() {
  stage++;
  
  // 현재 화면의 적/레이저 정리 (플레이어 관련 제외)
  gameObjects = gameObjects.filter(go => go.type === "Hero" || go.type === "Sidekick");
  
  // 다음 스테이지 적 생성
  createEnemies();
}

function endGame(win) {
  gameOver = true;
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (win) {
      displayMessage("Victory!!! Press [Enter] to restart", "green");
    } else {
      displayMessage("You died!!! Press [Enter] to restart", "red");
    }
  }, 200);
}

function resetGame() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
  eventEmitter.clear();
  gameObjects.forEach((go) => {
    if (go.destroy) go.destroy();
  });

  gameObjects = [];
  hero = null;
  leftSidekick = null;
  rightSidekick = null;
  gameOver = false;
  stage = 1; // 스테이지 1로 리셋

  initGame();
  startGameLoop();
}

// =====================
// 게임 초기화
// =====================
function initGame() {
  createEnemies();
  createHero();
  createSidekicks();

  const SPEED = 10;

  // 키보드 이동 이벤트
  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    if (gameOver) return;
    hero.y -= SPEED; leftSidekick.y -= SPEED; rightSidekick.y -= SPEED;
  });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    if (gameOver) return;
    hero.y += SPEED; leftSidekick.y += SPEED; rightSidekick.y += SPEED;
  });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    if (gameOver) return;
    hero.x -= SPEED; leftSidekick.x -= SPEED; rightSidekick.x -= SPEED;
  });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    if (gameOver) return;
    hero.x += SPEED; leftSidekick.x += SPEED; rightSidekick.x += SPEED;
  });

  // 스페이스바 (차지/발사)
  eventEmitter.on(Messages.KEY_EVENT_SPACE_DOWN, () => { if (!gameOver) hero.startCharge(); });
  eventEmitter.on(Messages.KEY_EVENT_SPACE_UP, () => { if (!gameOver) hero.stopCharge(); });

  // 1. 아군 레이저 -> 적/보스 충돌
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    // first: Laser, second: Enemy/Boss
    first.destroy();
    
    if (second.type === "Boss") {
      second.hp -= 1; // 보스는 한 방에 안 죽음
      if (second.hp <= 0) {
        second.destroy();
        gameObjects.push(new Explosion(second.x, second.y));
        hero.incrementPoints(1000);
      }
    } else {
      // 일반 적은 즉사
      second.destroy();
      gameObjects.push(new Explosion(second.x, second.y));
      hero.incrementPoints(100);
    }

    if (isEnemiesDead()) {
      if (stage < MAX_STAGE) {
        setTimeout(nextStage, 1000); // 1초 뒤 다음 스테이지
      } else {
        eventEmitter.emit(Messages.GAME_END_WIN);
      }
    }
  });

  // 2. 적 몸체 -> 아군 충돌
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    if (enemy.type === "Enemy") enemy.destroy();
    // 보스와 부딪히면 보스는 안 죽고 영웅만 데미지 입음 (구현 선택)

    hero.decrementLife();
    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
    } else if (isEnemiesDead() && stage === MAX_STAGE) {
       // 보스와 부딪혀서 내가 안 죽고 보스가 죽을 수도 있으니 체크
       eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  // 3. 적/보스 레이저 -> 아군 충돌 [NEW]
  eventEmitter.on(Messages.COLLISION_BOSS_LASER_HERO, (_, { laser }) => {
     laser.destroy();
     hero.decrementLife();
     if (isHeroDead()) {
       eventEmitter.emit(Messages.GAME_END_LOSS);
     }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => endGame(true));
  eventEmitter.on(Messages.GAME_END_LOSS, () => endGame(false));
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => resetGame());
}

// =====================
// 게임 상태 업데이트 (수정됨)
// =====================
function updateGameObjects() {
  gameObjects.forEach((go) => {
    try { go.update(); } catch (e) {}
  });

  const enemies = gameObjects.filter((go) => (go.type === "Enemy" || go.type === "Boss") && !go.dead);
  const lasers = gameObjects.filter((go) => go.type === "Laser" && !go.dead);
  const chargeLasers = gameObjects.filter((go) => go.type === "ChargeLaser" && !go.dead);
  const enemyLasers = gameObjects.filter((go) => go.type === "EnemyLaser" && !go.dead);

  // 1. 아군 레이저 vs 적
  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { first: l, second: m });
      }
    });
  });

  // 2. 아군 차지 레이저 (관통)
  chargeLasers.forEach((cl) => {
    enemies.forEach((m) => {
      if (!m.dead && intersectRect(cl.rectFromGameObject(), m.rectFromGameObject())) {
        if (m.type === "Boss") {
            // 차지샷 보스 데미지 (파워 비례)
            m.hp -= cl.power * 2; 
            if (m.hp <= 0) {
                m.destroy();
                hero.incrementPoints(1000);
                gameObjects.push(new Explosion(m.x, m.y)); // 폭발 효과 추가

                // [중요] 보스가 죽었을 때 승리 조건 체크 추가!
                if (isEnemiesDead()) {
                   eventEmitter.emit(Messages.GAME_END_WIN);
                }
            }
        } else {
            m.destroy();
            hero.incrementPoints(100);
            gameObjects.push(new Explosion(m.x, m.y)); // 폭발 효과 추가
        }
      }
    });
  });

  // 3. 적/보스 레이저 vs 아군
  if (hero) {
    const heroRect = hero.rectFromGameObject();
    enemyLasers.forEach((el) => {
       if (intersectRect(el.rectFromGameObject(), heroRect)) {
           eventEmitter.emit(Messages.COLLISION_BOSS_LASER_HERO, { laser: el });
       }
    });

    // 4. 적 몸체 vs 아군
    enemies.forEach((enemy) => {
      if (intersectRect(heroRect, enemy.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
      }
    });
  }

  // Remove dead objects
  gameObjects = gameObjects.filter((go) => {
    if (go.dead) {
      if (go.destroy) go.destroy();
      return false;
    }
    return true;
  });
}

// =====================
// 화면 그리기
// =====================
function drawPoints() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.fillText("Points: " + (hero ? hero.points : 0), 10, canvas.height - 20);
  
  // 스테이지 표시
  ctx.fillText("Stage: " + stage, 10, canvas.height - 50);
}

function drawLife() {
  if (!lifeImg) return;
  const START_POS = canvas.width - 180;
  for (let i = 0; i < (hero ? hero.life : 0); i++) {
    ctx.drawImage(lifeImg, START_POS + 45 * i, canvas.height - 37, 40, 30);
  }
}

function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

function startGameLoop() {
  if (gameLoopId) clearInterval(gameLoopId);
  gameLoopId = setInterval(() => {
    // 사이드킥 추적
    if (hero) {
      if (leftSidekick) { leftSidekick.x = hero.x - 60; leftSidekick.y = hero.y + 20; }
      if (rightSidekick) { rightSidekick.x = hero.x + 110; rightSidekick.y = hero.y + 20; }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    drawPoints();
    drawLife();
    updateGameObjects();
  }, 16);
}

// =====================
// 키보드 리스너
// =====================
window.addEventListener("keydown", (evt) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(evt.code)) {
    evt.preventDefault();
  }
  if (evt.code === "ArrowUp") eventEmitter.emit(Messages.KEY_EVENT_UP);
  if (evt.code === "ArrowDown") eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  if (evt.code === "ArrowLeft") eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  if (evt.code === "ArrowRight") eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  if (evt.code === "Space") eventEmitter.emit(Messages.KEY_EVENT_SPACE_DOWN);
});

window.addEventListener("keyup", (evt) => {
  if (evt.code === "Space") eventEmitter.emit(Messages.KEY_EVENT_SPACE_UP);
  if (evt.key === "Enter") eventEmitter.emit(Messages.KEY_EVENT_ENTER);
});

// =====================
// 메인 실행 (수정됨)
// =====================
window.onload = async () => {
  try {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");

    // 기본 이미지 로드
    heroImg = await loadTexture("assets/player.png");
    enemyImg = await loadTexture("assets/enemyShip.png");
    laserImg = await loadTexture("assets/laserRed.png");
    laserShotImg = await loadTexture("assets/laserRedShot.png");
    lifeImg = await loadTexture("assets/life.png");
    
    // [중요] 보스 이미지 경로 설정 (지정하신 경로)
    try {
        ufoImg = await loadTexture("assets/ENEMY.jpeg");
    } catch(e) {
        console.warn("지정한 경로에서 보스 이미지를 찾을 수 없어 기본 적 이미지로 대체합니다.");
        ufoImg = enemyImg; 
    }

    initGame();
    startGameLoop();
  } catch (e) {
    console.error("Initialization error:", e);
    if(ctx) {
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("Error loading game resources. Check console.", 50, 50);
    }
  }
};