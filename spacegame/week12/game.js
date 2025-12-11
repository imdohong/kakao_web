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

  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",

  GAME_END_WIN: "GAME_END_WIN",
  GAME_END_LOSS: "GAME_END_LOSS",
};

// =====================
// EventEmitter (간단한 pub/sub)
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
let heroImg, enemyImg, laserImg, laserShotImg, lifeImg;
let gameObjects = [];
let hero = null;
let leftSidekick = null;
let rightSidekick = null;
let eventEmitter = new EventEmitter();
let gameLoopId = null;
let gameOver = false;

// =====================
// 이미지 로더 (Promise)
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
// [수정됨] 기본 GameObject
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
    
    // [추가] 타이머 ID 관리용 배열
    this.intervalIds = [];
  }

  // [추가] 타이머 등록 메서드
  registerInterval(id) {
    this.intervalIds.push(id);
  }

  // [추가] 객체 파괴 시 타이머 정리 메서드
  destroy() {
    this.dead = true;
    this.intervalIds.forEach(id => clearInterval(id));
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
      ctx.fillStyle = this.type === "Enemy" ? "red" : "blue";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  update() {
    // 서브클래스에서 구현
  }
}

// =====================
// [수정됨] Hero (플레이어)
// =====================
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.cooldown = 0;

    // 차지 관련
    this.charging = false;
    this.charge = 0;
    this.chargeInterval = null;

    // 점수 & 생명
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
      
      // [수정] 타이머 등록
      this.registerInterval(id);
    }
  }

  // [추가] 차지 시작 로직 분리 및 타이머 등록
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

  // [추가] 차지 중단 로직 분리
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
      this.destroy(); // [수정] dead = true 대신 destroy 호출
    }
  }

  incrementPoints() {
    this.points += 100;
  }
}

// =====================
// [수정됨] Enemy
// =====================
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";

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

    // [수정] 타이머 등록
    this.registerInterval(moveInterval);
  }
}

// =====================
// [수정됨] Laser (기본 레이저)
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
        this.destroy(); // [수정] dead=true 대신 destroy()
        clearInterval(moveInterval);
      }
    }, 15);

    // [수정] 타이머 등록
    this.registerInterval(moveInterval);
  }
}

// =====================
// ChargeLaser (차지샷) - 타이머 없음
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
    ctx.fillStyle = "rgba(0,180,255,0.6)";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// =====================
// [수정됨] Sidekick (보조비행선)
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

    // [수정] 타이머 등록 (이 부분이 버그의 핵심 원인이었음)
    this.registerInterval(autoId);
  }
}

// =====================
// Explosion (폭발)
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
// 충돌 판정 유틸
// =====================
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

// =====================
// 생성 관련 함수들
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

function createEnemies() {
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * 98;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += 98) {
    for (let y = 0; y < 50 * 5; y += 50) {
      const enemy = new Enemy(x, y);
      enemy.img = enemyImg;
      gameObjects.push(enemy);
    }
  }
}

// =====================
// 그리기 - 점수/목숨 포함
// =====================
function drawPoints() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "left";
  ctx.fillText("Points: " + (hero ? hero.points : 0), 10, canvas.height - 20);
}

function drawLife() {
  if (!lifeImg) return;
  const START_POS = canvas.width - 180;
  for (let i = 0; i < (hero ? hero.life : 0); i++) {
    ctx.drawImage(lifeImg, START_POS + 45 * i, canvas.height - 37, 40, 30);
  }
}

// =====================
// 종료/재시작 관련 유틸
// =====================
function isHeroDead() {
  return hero && hero.life <= 0;
}

function isEnemiesDead() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  return enemies.length === 0;
}

function displayMessage(message, color = "red") {
  ctx.font = "22px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
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

// =====================
// [수정됨] resetGame - 타이머 정리 로직 추가
// =====================
function resetGame() {
  // 기존 루프 정지
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }

  // 이벤트 리스너 제거
  eventEmitter.clear();

  // [중요] 기존 객체들의 타이머를 모두 강제 종료
  gameObjects.forEach((go) => {
    if (go.destroy) go.destroy();
  });

  // 게임 오브젝트 및 상태 초기화
  gameObjects = [];
  hero = null;
  leftSidekick = null;
  rightSidekick = null;
  gameOver = false;

  // 재초기화
  initGame();
  startGameLoop();
}

// =====================
// 게임 초기화 (리스너 등록 등)
// =====================
function initGame() {
  gameObjects = [];
  createEnemies();
  createHero();
  createSidekicks();

  const SPEED = 10;

  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    if (gameOver) return;
    hero.y -= SPEED;
    leftSidekick.y -= SPEED;
    rightSidekick.y -= SPEED;
  });

  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    if (gameOver) return;
    hero.y += SPEED;
    leftSidekick.y += SPEED;
    rightSidekick.y += SPEED;
  });

  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    if (gameOver) return;
    hero.x -= SPEED;
    leftSidekick.x -= SPEED;
    rightSidekick.x -= SPEED;
  });

  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    if (gameOver) return;
    hero.x += SPEED;
    leftSidekick.x += SPEED;
    rightSidekick.x += SPEED;
  });

  // [수정됨] 차지 시작 - 메서드 호출로 변경
  eventEmitter.on(Messages.KEY_EVENT_SPACE_DOWN, () => {
    if (gameOver) return;
    hero.startCharge();
  });

  // [수정됨] 차지 끝 - 메서드 호출로 변경
  eventEmitter.on(Messages.KEY_EVENT_SPACE_UP, () => {
    if (gameOver) return;
    hero.stopCharge();
  });

  // 엔미 충돌 처리: 레이저 -> 적
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    if (first) first.destroy(); // dead 대신 destroy
    if (second) {
      second.destroy(); // dead 대신 destroy
      gameObjects.push(new Explosion(second.x, second.y));
      if (hero) hero.incrementPoints();
    }

    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  // 영웅과 적 충돌
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    if (!enemy) return;
    enemy.destroy(); // dead 대신 destroy
    if (hero) hero.decrementLife();

    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
      return;
    }
    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  // 게임 종료 이벤트
  eventEmitter.on(Messages.GAME_END_WIN, () => endGame(true));
  eventEmitter.on(Messages.GAME_END_LOSS, () => endGame(false));

  // 엔터키로 재시작
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
    resetGame();
  });
}

// =====================
// [수정됨] 업데이트 (충돌 포함)
// =====================
function updateGameObjects() {
  gameObjects.forEach((go) => {
    try { go.update(); } catch (e) {}
  });

  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  const lasers = gameObjects.filter((go) => go.type === "Laser" && !go.dead);
  const chargeLasers = gameObjects.filter((go) => go.type === "ChargeLaser" && !go.dead);

  // 레이저 vs 적 충돌
  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { first: l, second: m });
      }
    });
  });

  // 차지 레이저 관통 처리
  chargeLasers.forEach((cl) => {
    enemies.forEach((m) => {
      if (!m.dead && intersectRect(cl.rectFromGameObject(), m.rectFromGameObject())) {
        m.destroy(); // dead 대신 destroy
        if (hero) hero.incrementPoints();
      }
    });
  });

  // 적과 영웅 충돌 검사
  if (hero) {
    const heroRect = hero.rectFromGameObject();
    enemies.forEach((enemy) => {
      if (intersectRect(heroRect, enemy.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
      }
    });
  }

  // [수정] remove dead - 죽은 객체의 타이머를 확실히 정리
  gameObjects = gameObjects.filter((go) => {
    if (go.dead) {
      if (go.destroy) go.destroy();
      return false;
    }
    return true;
  });
}

// =====================
// 그리기 전체
// =====================
function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

// =====================
// 게임 루프 시작/정지
// =====================
function startGameLoop() {
  if (gameLoopId) clearInterval(gameLoopId);
  gameLoopId = setInterval(() => {
    // 보조 비행선 따라오기
    if (hero) {
      if (leftSidekick) {
        leftSidekick.x = hero.x - 60;
        leftSidekick.y = hero.y + 20;
      }
      if (rightSidekick) {
        rightSidekick.x = hero.x + 110;
        rightSidekick.y = hero.y + 20;
      }
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
// 키 입력 이벤트 (keydown/keyup)
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
// 시작 시 로드 및 초기화
// =====================
window.onload = async () => {
  try {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");

    // 이미지 로드
    heroImg = await loadTexture("assets/player.png");
    enemyImg = await loadTexture("assets/enemyShip.png");
    laserImg = await loadTexture("assets/laserRed.png");
    laserShotImg = await loadTexture("assets/laserRedShot.png");
    lifeImg = await loadTexture("assets/life.png");

    // 초기화 및 루프 시작
    initGame();
    startGameLoop();
  } catch (e) {
    console.error("Initialization error:", e);
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "16px monospace";
      ctx.fillText("게임 로드 실패: 콘솔 확인", 20, 40);
      ctx.fillText(String(e), 20, 70);
    } else {
      alert("게임 초기화 실패: " + e);
    }
  }
};