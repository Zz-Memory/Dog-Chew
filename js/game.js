// 图片资源已在HTML中定义为全局变量
// dog1Url, cat1Url, cat2Url, cat3Url, cat4Url

// 游戏配置
const config = {
  // 地图尺寸配置 - 实际尺寸会在初始化时设置为3000x3000
  mapSizes: {
    small: { width: 1000, height: 1000 },
    medium: { width: 3000, height: 3000 },
    large: { width: 5000, height: 5000 },
  },
  // 不同地图大小的玩家初始速度
  initialSpeeds: {
    small: 180, // 小地图速度快
    medium: 150,
    large: 120, // 大地图速度慢
  },
  // 不同地图大小的玩家初始尺寸
  playerInitialSizes: {
    small: 30, // 小地图初始尺寸小
    medium: 50,
    large: 100, // 大地图初始尺寸大
  },
  minSpeed: 100,
  // 不同地图大小的安全距离
  safeDistance: {
    small: 80, // 小地图安全距离小
    medium: 120,
    large: 160, // 大地图安全距离大
  },
  // 不同地图大小的敌人数量
  enemyCounts: {
    small: 8, // 小地图敌人少
    medium: 15,
    large: 25, // 大地图敌人多
  },
  // 不同地图大小的资源密度
  resourceDensity: {
    small: 1.5, // 小地图资源密度高
    medium: 1.2, // 增加中型地图的资源密度
    large: 1.0, // 大地图资源密度低
  },
  // 不同地图大小的资源生成速率（毫秒）
  resourceGenerationRate: {
    small: 75, // 小地图资源生成非常快（加快2倍）
    medium: 100, // 加快2倍
    large: 125, // 大地图资源生成较快（加快2倍）
  },
  // 不同地图大小的敌人生成速率（毫秒）
  enemyGenerationRates: {
    small: 500, // 小型地图：0.5秒一个
    medium: 1000, // 中型地图：1秒一个
    large: 1500, // 大型地图：1.5秒一个
  },
  // 不同地图大小的初始敌人数量
  initialEnemyCounts: {
    small: 4, // 小型地图：4个
    medium: 8, // 中型地图：8个
    large: 12, // 大型地图：12个
  },
  // 不同地图大小的网格尺寸
  gridSize: {
    small: 40, // 小地图网格小
    medium: 60,
    large: 80, // 大地图网格大
  },
  // 炸弹相关配置
  bombs: {
    // 不同地图大小的炸弹数量
    count: {
      small: 20,
      medium: 20,
      large: 20,
    },
    // 炸弹生成速率（毫秒）
    generationRate: {
      small: 2000, // 2秒
      medium: 2000, // 2秒
      large: 2000, // 2秒
    },
    // 炸弹大小
    size: 15,
    // 炸弹爆炸后产生的资源数量
    resourceCount: 5,
    // 体积减少比例
    shrinkRatio: 0.1, // 10%
  },
};

// 游戏状态
let gameState = {
  mapSize: "medium", // 统一使用中型地图
  controlType: "keyboard",
  isRunning: false,
  canvas: null,
  ctx: null,
  player: null,
  enemies: [],
  resources: [],
  bombs: [],
  keysPressed: {},
  joystickActive: false,
  joystickAngle: 0,
  joystickStrength: 0,
  lastTime: 0,
  resourceTimer: 0,
  enemyTimer: 0,
  bombTimer: 0,
};

// 玩家类
class Player {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size; // 直径
    this.initialSize = size;
    this.speed = getInitialSpeed();
    this.img = createImage(dog1Url);
  }

  update(deltaTime) {
    // 根据按键或摇杆更新位置
    let dx = 0;
    let dy = 0;

    if (gameState.controlType === "keyboard") {
      if (gameState.keysPressed["w"] || gameState.keysPressed["ArrowUp"])
        dy -= 1;
      if (gameState.keysPressed["s"] || gameState.keysPressed["ArrowDown"])
        dy += 1;
      if (gameState.keysPressed["a"] || gameState.keysPressed["ArrowLeft"])
        dx -= 1;
      if (gameState.keysPressed["d"] || gameState.keysPressed["ArrowRight"])
        dx += 1;

      // 归一化对角线移动
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }
    } else if (
      gameState.controlType === "joystick" &&
      gameState.joystickActive
    ) {
      dx = Math.cos(gameState.joystickAngle) * gameState.joystickStrength;
      dy = Math.sin(gameState.joystickAngle) * gameState.joystickStrength;
    }

    // 计算当前速度
    const currentSpeed = this.calculateSpeed();

    // 更新位置
    this.x += dx * currentSpeed * deltaTime;
    this.y += dy * currentSpeed * deltaTime;

    // 边界检查 - 使用地图尺寸而不是画布尺寸
    const mapSize = config.mapSizes[gameState.mapSize];
    this.x = Math.max(
      this.size / 2,
      Math.min(mapSize.width - this.size / 2, this.x)
    );
    this.y = Math.max(
      this.size / 2,
      Math.min(mapSize.height - this.size / 2, this.y)
    );

    // 检查资源碰撞
    this.checkResourceCollisions();

    // 检查敌人碰撞
    this.checkEnemyCollisions();

    // 检查胜利条件
    this.checkVictoryCondition();
  }

  calculateSpeed() {
    // 速度衰减公式：当前速度 = 初始速度 × (初始直径 / 当前直径)^0.5
    let speed = getInitialSpeed() * Math.pow(this.initialSize / this.size, 0.5);

    // 最低速度限制
    const mapSize = config.mapSizes[gameState.mapSize];
    if (this.size >= mapSize.width / 2) {
      speed = Math.max(speed, config.minSpeed);
    }

    return speed;
  }

  checkResourceCollisions() {
    for (let i = gameState.resources.length - 1; i >= 0; i--) {
      const resource = gameState.resources[i];
      const distance = getDistance(this.x, this.y, resource.x, resource.y);

      if (distance < this.size / 2 + resource.size / 2) {
        // 吃掉资源，增加大小（使用对数函数使成长更平缓）
        // 使用对数函数：增长量随着角色尺寸增大而减少
        const growthFactor = 1 / (1 + Math.log10(Math.max(1, this.size / 100)));
        this.size += (resource.size / 10) * growthFactor;
        gameState.resources.splice(i, 1);
      }
    }

    // 检查炸弹碰撞
    this.checkBombCollisions();
  }

  checkBombCollisions() {
    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
      const bomb = gameState.bombs[i];
      const distance = getDistance(this.x, this.y, bomb.x, bomb.y);

      if (distance < this.size / 2 + bomb.size / 2) {
        // 获取地图尺寸，用于计算惩罚上限
        const mapSize = config.mapSizes[gameState.mapSize];
        const victorySize = Math.min(mapSize.width, mapSize.height);

        // 计算当前尺寸与胜利尺寸的比例
        const sizeRatio = this.size / victorySize;

        // 动态调整惩罚比例：尺寸越接近胜利条件，惩罚越轻
        // 当尺寸达到胜利条件的40%以上时，惩罚减轻
        let adjustedShrinkRatio = config.bombs.shrinkRatio;
        if (sizeRatio > 0.4) {
          // 线性减少惩罚，从10%逐渐减少到1%
          adjustedShrinkRatio =
            config.bombs.shrinkRatio * (1 - (sizeRatio - 0.4) * 1.67);
          adjustedShrinkRatio = Math.max(0.01, adjustedShrinkRatio); // 最低1%的惩罚
        }

        // 碰到炸弹，减少体积
        const shrinkAmount = this.size * adjustedShrinkRatio;
        this.size -= shrinkAmount;

        // 将减少的体积转化为资源散布在周围
        this.createResourcesFromShrink(bomb.x, bomb.y, shrinkAmount);

        // 移除炸弹
        gameState.bombs.splice(i, 1);
      }
    }
  }

  createResourcesFromShrink(bombX, bombY, shrinkAmount) {
    // 将减少的体积转化为资源
    const resourceCount = config.bombs.resourceCount;
    const resourceSize = shrinkAmount / resourceCount;

    // 获取初始速度作为资源散布距离
    const initialSpeed = getInitialSpeed();

    // 在炸弹周围随机位置生成资源
    for (let i = 0; i < resourceCount; i++) {
      // 随机角度和距离
      const angle = Math.random() * Math.PI * 2;
      // 使用初始速度作为基准距离，添加一些随机性
      const distance = initialSpeed * (0.8 + Math.random() * 0.4); // 初始速度的0.8-1.2倍

      // 计算资源位置
      const x = bombX + Math.cos(angle) * distance;
      const y = bombY + Math.sin(angle) * distance;

      // 创建新资源
      const resource = new Resource(x, y);
      resource.size = Math.max(5, Math.min(15, resourceSize)); // 限制资源大小在5-15之间
      gameState.resources.push(resource);
    }
  }

  checkEnemyCollisions() {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = gameState.enemies[i];
      const distance = getDistance(this.x, this.y, enemy.x, enemy.y);

      // 计算重叠面积判定伤害
      const playerRadius = this.size / 2;
      const enemyRadius = enemy.size / 2;

      if (distance < playerRadius + enemyRadius) {
        // 计算重叠面积
        const overlapArea = calculateOverlapArea(
          playerRadius,
          enemyRadius,
          distance
        );
        const playerArea = Math.PI * playerRadius * playerRadius;
        const enemyArea = Math.PI * enemyRadius * enemyRadius;

        // 检查重叠面积是否达到任一角色面积的1/3
        if (overlapArea >= playerArea / 3 || overlapArea >= enemyArea / 3) {
          // 伤害判定发生
          if (this.size > enemy.size) {
            // 玩家吃掉敌人，获得敌人面积的一部分（使用对数函数使成长更平缓）
            // 使用对数函数：增长量随着角色尺寸增大而减少
            const growthFactor =
              1 / (1 + Math.log10(Math.max(1, this.size / 100)));
            this.size += enemy.size * 0.1 * growthFactor;
            gameState.enemies.splice(i, 1);
            spawnEnemy(); // 生成新敌人保持数量
          } else {
            // 玩家被吃
            gameOver();
            return;
          }
        }
      }
    }
  }

  checkVictoryCondition() {
    // 检查胜利条件 - 基于地图尺寸而不是画布尺寸
    // 当角色大小（直径）成长达到地图宽高时，判定为玩家获胜
    const mapSize = config.mapSizes[gameState.mapSize];
    if (this.size >= Math.min(mapSize.width, mapSize.height)) {
      victory();
    }
  }

  draw() {
    gameState.ctx.save();
    gameState.ctx.beginPath();
    gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    gameState.ctx.clip();
    gameState.ctx.drawImage(
      this.img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
    gameState.ctx.restore();

    // 绘制黑色边框
    gameState.ctx.beginPath();
    gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    gameState.ctx.strokeStyle = "#000000";
    gameState.ctx.lineWidth = 2;
    gameState.ctx.stroke();
  }
}

// 敌人类
class Enemy {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.initialSize = size;
    this.speed = getInitialSpeed() * (0.95 + Math.random() * 0.1); // 初始速度比玩家随机减少0-5%
    this.targetX = x;
    this.targetY = y;
    this.retargetTimer = 0;
    this.img = createImage(getRandomCatImage());
  }

  update(deltaTime) {
    // 更新目标位置
    this.updateTarget(deltaTime);

    // 计算当前速度
    const currentSpeed = this.calculateSpeed();

    // 向目标移动
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const moveX = (dx / distance) * currentSpeed * deltaTime;
      const moveY = (dy / distance) * currentSpeed * deltaTime;
      this.x += moveX;
      this.y += moveY;
    }

    // 边界检查 - 使用地图尺寸而不是画布尺寸
    const mapSize = config.mapSizes[gameState.mapSize];
    this.x = Math.max(
      this.size / 2,
      Math.min(mapSize.width - this.size / 2, this.x)
    );
    this.y = Math.max(
      this.size / 2,
      Math.min(mapSize.height - this.size / 2, this.y)
    );

    // 检查资源碰撞
    this.checkResourceCollisions();

    // 检查敌人碰撞
    this.checkEnemyCollisions();
  }

  calculateSpeed() {
    // 速度衰减公式：当前速度 = 初始速度 × (初始直径 / 当前直径)^0.5
    return this.speed * Math.pow(this.initialSize / this.size, 0.5);
  }

  updateTarget(deltaTime) {
    this.retargetTimer += deltaTime;

    // 每2秒重新选择目标
    if (this.retargetTimer >= 2) {
      this.retargetTimer = 0;

      // 检查附近的玩家和敌人
      const nearbyEntities = [];

      // 检查玩家
      const playerDistance = getDistance(
        this.x,
        this.y,
        gameState.player.x,
        gameState.player.y
      );
      if (
        playerDistance <
        config.safeDistance + this.size / 2 + gameState.player.size / 2
      ) {
        nearbyEntities.push({
          x: gameState.player.x,
          y: gameState.player.y,
          size: gameState.player.size,
          distance: playerDistance,
        });
      }

      // 检查其他敌人
      for (const enemy of gameState.enemies) {
        if (enemy !== this) {
          const enemyDistance = getDistance(this.x, this.y, enemy.x, enemy.y);
          if (
            enemyDistance <
            config.safeDistance + this.size / 2 + enemy.size / 2
          ) {
            nearbyEntities.push({
              x: enemy.x,
              y: enemy.y,
              size: enemy.size,
              distance: enemyDistance,
            });
          }
        }
      }

      // 决定行为
      if (nearbyEntities.length > 0) {
        // 找到最近的实体
        nearbyEntities.sort((a, b) => a.distance - b.distance);
        const nearest = nearbyEntities[0];

        if (this.size > nearest.size) {
          // 追击比自己小的实体
          this.targetX = nearest.x;
          this.targetY = nearest.y;
        } else {
          // 逃离比自己大的实体
          const dx = this.x - nearest.x;
          const dy = this.y - nearest.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            this.targetX = this.x + (dx / distance) * 200;
            this.targetY = this.y + (dy / distance) * 200;
          }
        }
      } else {
        // 随机移动或寻找资源
        if (gameState.resources.length > 0 && Math.random() < 0.7) {
          // 70%的几率寻找最近的资源
          let closestResource = null;
          let closestDistance = Infinity;

          for (const resource of gameState.resources) {
            const distance = getDistance(
              this.x,
              this.y,
              resource.x,
              resource.y
            );
            if (distance < closestDistance) {
              closestDistance = distance;
              closestResource = resource;
            }
          }

          if (closestResource) {
            this.targetX = closestResource.x;
            this.targetY = closestResource.y;
          }
        } else {
          // 随机移动
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 200 + 100;
          this.targetX = this.x + Math.cos(angle) * distance;
          this.targetY = this.y + Math.sin(angle) * distance;
        }
      }

      // 确保目标在地图范围内
      this.targetX = Math.max(
        this.size / 2,
        Math.min(gameState.canvas.width - this.size / 2, this.targetX)
      );
      this.targetY = Math.max(
        this.size / 2,
        Math.min(gameState.canvas.height - this.size / 2, this.targetY)
      );
    }
  }

  checkResourceCollisions() {
    for (let i = gameState.resources.length - 1; i >= 0; i--) {
      const resource = gameState.resources[i];
      const distance = getDistance(this.x, this.y, resource.x, resource.y);

      if (distance < this.size / 2 + resource.size / 2) {
        // 吃掉资源，增加大小（使用对数函数使成长更平缓）
        // 使用对数函数：增长量随着角色尺寸增大而减少
        const growthFactor = 1 / (1 + Math.log10(Math.max(1, this.size / 100)));
        this.size += (resource.size / 10) * growthFactor;
        gameState.resources.splice(i, 1);
      }
    }

    // 检查炸弹碰撞
    this.checkBombCollisions();
  }

  checkBombCollisions() {
    for (let i = gameState.bombs.length - 1; i >= 0; i--) {
      const bomb = gameState.bombs[i];
      const distance = getDistance(this.x, this.y, bomb.x, bomb.y);

      if (distance < this.size / 2 + bomb.size / 2) {
        // 获取地图尺寸，用于计算惩罚上限
        const mapSize = config.mapSizes[gameState.mapSize];
        const victorySize = Math.min(mapSize.width, mapSize.height);

        // 计算当前尺寸与胜利尺寸的比例
        const sizeRatio = this.size / victorySize;

        // 动态调整惩罚比例：尺寸越接近胜利条件，惩罚越轻
        // 当尺寸达到胜利条件的40%以上时，惩罚减轻
        let adjustedShrinkRatio = config.bombs.shrinkRatio;
        if (sizeRatio > 0.4) {
          // 线性减少惩罚，从10%逐渐减少到1%
          adjustedShrinkRatio =
            config.bombs.shrinkRatio * (1 - (sizeRatio - 0.4) * 1.67);
          adjustedShrinkRatio = Math.max(0.01, adjustedShrinkRatio); // 最低1%的惩罚
        }

        // 碰到炸弹，减少体积
        const shrinkAmount = this.size * adjustedShrinkRatio;
        this.size -= shrinkAmount;

        // 将减少的体积转化为资源散布在周围
        this.createResourcesFromShrink(bomb.x, bomb.y, shrinkAmount);

        // 移除炸弹
        gameState.bombs.splice(i, 1);
      }
    }
  }

  createResourcesFromShrink(bombX, bombY, shrinkAmount) {
    // 将减少的体积转化为资源
    const resourceCount = config.bombs.resourceCount;
    const resourceSize = shrinkAmount / resourceCount;

    // 获取初始速度作为资源散布距离
    const initialSpeed = getInitialSpeed();

    // 在炸弹周围随机位置生成资源
    for (let i = 0; i < resourceCount; i++) {
      // 随机角度和距离
      const angle = Math.random() * Math.PI * 2;
      // 使用初始速度作为基准距离，添加一些随机性
      const distance = initialSpeed * (0.8 + Math.random() * 0.4); // 初始速度的0.8-1.2倍

      // 计算资源位置
      const x = bombX + Math.cos(angle) * distance;
      const y = bombY + Math.sin(angle) * distance;

      // 创建新资源
      const resource = new Resource(x, y);
      resource.size = Math.max(5, Math.min(15, resourceSize)); // 限制资源大小在5-15之间
      gameState.resources.push(resource);
    }
  }

  checkEnemyCollisions() {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = gameState.enemies[i];

      // 跳过自己
      if (enemy === this) continue;

      const distance = getDistance(this.x, this.y, enemy.x, enemy.y);

      // 计算重叠面积判定伤害
      const thisRadius = this.size / 2;
      const enemyRadius = enemy.size / 2;

      if (distance < thisRadius + enemyRadius) {
        // 计算重叠面积
        const overlapArea = calculateOverlapArea(
          thisRadius,
          enemyRadius,
          distance
        );
        const thisArea = Math.PI * thisRadius * thisRadius;
        const enemyArea = Math.PI * enemyRadius * enemyRadius;

        // 检查重叠面积是否达到任一角色面积的1/3
        if (overlapArea >= thisArea / 3 || overlapArea >= enemyArea / 3) {
          // 伤害判定发生
          if (this.size > enemy.size) {
            // 当前敌人吃掉另一个敌人，获得敌人面积的一部分（使用对数函数使成长更平缓）
            // 使用对数函数：增长量随着角色尺寸增大而减少
            const growthFactor =
              1 / (1 + Math.log10(Math.max(1, this.size / 100)));
            this.size += enemy.size * 0.1 * growthFactor;
            gameState.enemies.splice(i, 1);
            spawnEnemy(); // 生成新敌人保持数量
          }
          // 注意：如果当前敌人较小，不需要处理，因为另一个敌人会处理这个碰撞
        }
      }
    }
  }

  draw() {
    gameState.ctx.save();
    gameState.ctx.beginPath();
    gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    gameState.ctx.clip();
    gameState.ctx.drawImage(
      this.img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
    gameState.ctx.restore();

    // 绘制黑色边框
    gameState.ctx.beginPath();
    gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    gameState.ctx.strokeStyle = "#000000";
    gameState.ctx.lineWidth = 2;
    gameState.ctx.stroke();
  }
}

// 资源类
class Resource {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 4; // 资源大小随机4-12，减小资源大小范围
    this.color = getRandomColor();
  }

  draw() {
    gameState.ctx.beginPath();
    gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    gameState.ctx.fillStyle = this.color;
    gameState.ctx.fill();
  }
}

// 炸弹类
class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = config.bombs.size;
    this.pulsePhase = 0; // 用于脉动动画
  }

  update(deltaTime) {
    // 脉动动画
    this.pulsePhase += deltaTime * 0.003;
    if (this.pulsePhase > Math.PI * 2) {
      this.pulsePhase -= Math.PI * 2;
    }
  }

  draw() {
    const ctx = gameState.ctx;
    const pulseSize = this.size * (1 + Math.sin(this.pulsePhase) * 0.1);

    // 绘制炸弹主体（黑色圆形）
    ctx.beginPath();
    ctx.arc(this.x, this.y, pulseSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    // 绘制红色十字
    ctx.beginPath();
    // 水平线
    ctx.moveTo(this.x - pulseSize / 3, this.y);
    ctx.lineTo(this.x + pulseSize / 3, this.y);
    // 垂直线
    ctx.moveTo(this.x, this.y - pulseSize / 3);
    ctx.lineTo(this.x, this.y + pulseSize / 3);
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = pulseSize / 6;
    ctx.stroke();

    // 绘制闪光效果
    ctx.beginPath();
    ctx.arc(
      this.x - pulseSize / 5,
      this.y - pulseSize / 5,
      pulseSize / 10,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
  }
}

// 辅助函数
function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// 计算两个圆的重叠面积
function calculateOverlapArea(r1, r2, d) {
  // 如果距离大于等于两个半径之和，没有重叠
  if (d >= r1 + r2) {
    return 0;
  }

  // 如果一个圆完全包含另一个圆
  if (d <= Math.abs(r1 - r2)) {
    const smallerRadius = Math.min(r1, r2);
    return Math.PI * smallerRadius * smallerRadius;
  }

  // 计算两个圆相交的重叠面积
  // 使用圆相交面积公式
  const part1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const part2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const part3 =
    0.5 *
    Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));

  return part1 + part2 - part3;
}

function getRandomColor() {
  const colors = [
    "#FF5252",
    "#FF4081",
    "#E040FB",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
    "#FFFF00",
    "#FFD740",
    "#FFAB40",
    "#FF6E40",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomCatImage() {
  const catImages = [cat1Url, cat2Url, cat3Url, cat4Url];
  return catImages[Math.floor(Math.random() * catImages.length)];
}

function createImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function getInitialSpeed() {
  return config.initialSpeeds.medium;
}

function spawnResources() {
  const mapSize = config.mapSizes.medium;
  const area = mapSize.width * mapSize.height;
  // 使用中型地图的资源密度
  const resourceCount = Math.floor(
    (area * config.resourceDensity.medium) / 1000
  ); // 根据地图大小和密度计算资源数量

  for (let i = 0; i < resourceCount; i++) {
    const x = Math.random() * mapSize.width;
    const y = Math.random() * mapSize.height;
    gameState.resources.push(new Resource(x, y));
  }
}

// 生成炸弹
function spawnBombs() {
  const bombCount = config.bombs.count[gameState.mapSize];
  const mapSize = config.mapSizes[gameState.mapSize];
  const margin = 50; // 边缘安全距离

  // 计算网格大小，以便均匀分布炸弹
  const gridColumns = Math.ceil(Math.sqrt(bombCount));
  const gridRows = Math.ceil(bombCount / gridColumns);

  const cellWidth = (mapSize.width - 2 * margin) / gridColumns;
  const cellHeight = (mapSize.height - 2 * margin) / gridRows;

  let bombsCreated = 0;

  // 在每个网格单元中放置一个炸弹，位置有一定随机性
  for (let row = 0; row < gridRows && bombsCreated < bombCount; row++) {
    for (let col = 0; col < gridColumns && bombsCreated < bombCount; col++) {
      // 计算网格单元的中心位置
      const cellCenterX = margin + col * cellWidth + cellWidth / 2;
      const cellCenterY = margin + row * cellHeight + cellHeight / 2;

      // 在网格单元内随机偏移，但不超过单元大小的1/3
      const offsetX = (Math.random() - 0.5) * cellWidth * 0.6;
      const offsetY = (Math.random() - 0.5) * cellHeight * 0.6;

      const x = cellCenterX + offsetX;
      const y = cellCenterY + offsetY;

      // 确保炸弹不会太靠近玩家
      const safeDistance = config.safeDistance[gameState.mapSize] * 2;
      if (
        !gameState.player ||
        getDistance(x, y, gameState.player.x, gameState.player.y) >=
          safeDistance
      ) {
        // 创建炸弹并添加到游戏状态
        const bomb = new Bomb(x, y);
        gameState.bombs.push(bomb);
        bombsCreated++;
      } else {
        // 如果太靠近玩家，尝试在单元格的另一个位置
        const newOffsetX = (Math.random() - 0.5) * cellWidth * 0.6;
        const newOffsetY = (Math.random() - 0.5) * cellHeight * 0.6;

        const newX = cellCenterX + newOffsetX;
        const newY = cellCenterY + newOffsetY;

        if (
          !gameState.player ||
          getDistance(newX, newY, gameState.player.x, gameState.player.y) >=
            safeDistance
        ) {
          const bomb = new Bomb(newX, newY);
          gameState.bombs.push(bomb);
          bombsCreated++;
        }
        // 如果第二次尝试仍然失败，跳过这个单元格
      }
    }
  }

  // 如果由于安全距离限制没有生成足够的炸弹，在随机位置生成剩余的炸弹
  while (bombsCreated < bombCount) {
    generateBomb();
    bombsCreated++;
  }
}

// 生成单个炸弹
function generateBomb() {
  const mapSize = config.mapSizes[gameState.mapSize];
  const margin = 50; // 边缘安全距离

  // 随机位置
  const x = Math.random() * (mapSize.width - 2 * margin) + margin;
  const y = Math.random() * (mapSize.height - 2 * margin) + margin;

  // 确保炸弹不会太靠近玩家
  const safeDistance = config.safeDistance[gameState.mapSize] * 2;
  if (
    gameState.player &&
    getDistance(x, y, gameState.player.x, gameState.player.y) < safeDistance
  ) {
    // 如果太近，重新生成
    generateBomb();
    return;
  }

  // 创建炸弹并添加到游戏状态
  const bomb = new Bomb(x, y);
  gameState.bombs.push(bomb);
}

function generateResource() {
  // 使用地图尺寸而不是画布尺寸
  const mapSize = config.mapSizes[gameState.mapSize];
  const x = Math.random() * mapSize.width;
  const y = Math.random() * mapSize.height;
  return new Resource(x, y);
}

function spawnEnemy() {
  // 使用地图尺寸而不是画布尺寸
  const mapSize = config.mapSizes[gameState.mapSize];
  let x, y, size;
  let isSafe = false;
  let attempts = 0;
  const maxAttempts = 100;

  // 按照Prompt.md要求：敌人最小为玩家初始大小，最大不超过地图1/20
  // 但为了游戏平衡，限制敌人初始最大大小不超过玩家初始大小的2倍
  const minSize = config.playerInitialSizes.medium;
  const theoreticalMaxSize = Math.min(mapSize.width, mapSize.height) / 20;
  const balancedMaxSize = config.playerInitialSizes.medium * 2;
  const maxSize = Math.min(theoreticalMaxSize, balancedMaxSize);
  size = Math.random() * (maxSize - minSize) + minSize;

  // 按照Prompt.md要求计算安全距离：敌人半径 + 玩家半径 + 玩家初始移动速度 × 3
  // 为了确保安全，在大型地图中增加额外的安全缓冲
  const enemyRadius = size / 2;
  const playerRadius = gameState.player.size / 2;
  const playerInitialSpeed = config.initialSpeeds.medium;
  const baseSafeDistance = config.safeDistance.medium;

  // 根据敌人大小增加安全缓冲
  const enemySizeMultiplier =
    size > config.playerInitialSizes.medium * 1.5 ? 1.3 : 1.0;
  const safeDistance = baseSafeDistance * enemySizeMultiplier;

  // 确保敌人生成位置与玩家保持安全距离
  while (!isSafe && attempts < maxAttempts) {
    x = Math.random() * mapSize.width;
    y = Math.random() * mapSize.height;

    attempts++;

    // 检查与玩家的安全距离
    const distanceToPlayer = getDistance(
      x,
      y,
      gameState.player.x,
      gameState.player.y
    );

    if (distanceToPlayer >= safeDistance) {
      // 检查与其他敌人的距离，避免重叠
      let safeFromEnemies = true;
      for (let enemy of gameState.enemies) {
        const distanceToEnemy = getDistance(x, y, enemy.x, enemy.y);
        const otherEnemyRadius = enemy.size / 2;
        const minDistanceToEnemy = enemyRadius + otherEnemyRadius + 10; // 简单的间隔

        if (distanceToEnemy < minDistanceToEnemy) {
          safeFromEnemies = false;
          break;
        }
      }

      if (safeFromEnemies) {
        isSafe = true;
      }
    }
  }

  // 如果仍未找到安全位置，在地图边缘生成
  if (!isSafe) {
    // 确保至少与玩家保持基本安全距离
    const minDistanceFromPlayer = safeDistance;
    const margin = Math.max(size, safeDistance / 2); // 使用安全距离的一半作为边缘距离

    // 直接选择离玩家最远的角落，确保最大安全距离
    const corners = [
      { x: margin, y: margin },
      { x: mapSize.width - margin, y: margin },
      { x: mapSize.width - margin, y: mapSize.height - margin },
      { x: margin, y: mapSize.height - margin },
    ];

    let maxDistance = 0;
    let bestCorner = corners[0];
    for (let corner of corners) {
      const distance = getDistance(
        corner.x,
        corner.y,
        gameState.player.x,
        gameState.player.y
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        bestCorner = corner;
      }
    }

    x = bestCorner.x;
    y = bestCorner.y;

    // 如果最远角落仍然不够安全，则减小敌人大小
    const finalDistance = getDistance(
      x,
      y,
      gameState.player.x,
      gameState.player.y
    );
    if (finalDistance < minDistanceFromPlayer) {
      // 减小敌人大小以确保安全
      const requiredSizeReduction = (minDistanceFromPlayer - finalDistance) * 2;
      size = Math.max(minSize, size - requiredSizeReduction);
    }
  }

  gameState.enemies.push(new Enemy(x, y, size));
}

function spawnEnemies() {
  const enemyCount = config.enemyCounts.medium;
  for (let i = 0; i < enemyCount; i++) {
    spawnEnemy();
  }
}

function gameOver() {
  gameState.isRunning = false;
  document.getElementById("game-over-screen").style.display = "flex";
}

function victory() {
  gameState.isRunning = false;
  document.getElementById("victory-screen").style.display = "flex";
}

function resetGame() {
  // 隐藏结束和胜利屏幕
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("victory-screen").style.display = "none";

  // 重置游戏状态
  gameState.isRunning = true;
  gameState.resources = [];
  gameState.enemies = [];
  gameState.bombs = [];

  // 调整画布显示尺寸
  resizeCanvas();

  // 使用中型地图配置
  const mapSize = config.mapSizes.medium;

  // 创建玩家，位于画布中心
  const playerInitialSize = config.playerInitialSizes.medium;
  gameState.player = new Player(
    gameState.canvas.width / 2,
    gameState.canvas.height / 2,
    playerInitialSize
  );

  // 生成资源
  spawnResources();

  // 生成初始敌人
  const initialEnemyCount = config.initialEnemyCounts.medium;
  for (let i = 0; i < initialEnemyCount; i++) {
    spawnEnemy();
  }

  // 生成炸弹
  spawnBombs();

  // 重置时间和定时器
  gameState.lastTime = performance.now();
  gameState.resourceTimer = 0;
  gameState.enemyTimer = 0;
  gameState.bombTimer = 0;

  // 开始游戏循环
  requestAnimationFrame(gameLoop);
}

function startGame() {
  // 隐藏开始屏幕，显示游戏容器
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("game-container").style.display = "block";

  // 如果是虚拟摇杆控制，显示摇杆
  if (gameState.controlType === "joystick") {
    document.getElementById("joystick-container").style.display = "block";
  }

  resetGame();
}

function gameLoop(timestamp) {
  if (!gameState.isRunning) return;

  // 计算时间差
  const deltaTime = (timestamp - gameState.lastTime) / 1000; // 转换为秒
  gameState.lastTime = timestamp;

  // 更新资源生成计时器
  gameState.resourceTimer += deltaTime * 1000; // 转换为毫秒
  if (gameState.resourceTimer >= config.resourceGenerationRate.medium) {
    gameState.resourceTimer = 0;
    gameState.resources.push(generateResource());
  }

  // 更新敌人生成计时器
  const targetEnemyCount = config.enemyCounts.medium;
  if (gameState.enemies.length < targetEnemyCount) {
    gameState.enemyTimer += deltaTime * 1000; // 转换为毫秒
    if (gameState.enemyTimer >= config.enemyGenerationRates.medium) {
      gameState.enemyTimer = 0;
      spawnEnemy();
    }
  }

  // 更新炸弹生成计时器
  gameState.bombTimer += deltaTime * 1000; // 转换为毫秒
  if (gameState.bombTimer >= config.bombs.generationRate[gameState.mapSize]) {
    gameState.bombTimer = 0;
    // 确保炸弹数量不超过配置的最大数量
    if (gameState.bombs.length < config.bombs.count[gameState.mapSize]) {
      generateBomb();
    }
  }

  // 更新炸弹动画
  for (const bomb of gameState.bombs) {
    bomb.update(deltaTime);
  }

  // 计算基于玩家大小的缩放比例 - 随着玩家变大，视角自动缩小以显示更多区域
  const baseScale = 1.0;
  const playerSizeRatio = gameState.player.size / gameState.player.initialSize;
  // 使用平缓的缩放算法，随着玩家变大，zoomFactor变小，视角范围变大
  const scaleFactor = 0.24; // 缩放敏感度，值越大缩放效果越明显（已调整为更适中的值）
  // 计算缩放因子：随着玩家变大，zoomFactor变小，使视野变宽
  const zoomFactor = Math.max(
    0.1, // 最小缩放限制，防止视角过于缩小（调整为更小值以允许更大的缩放范围）
    Math.min(1.0, baseScale / Math.pow(playerSizeRatio, scaleFactor))
  );

  // 获取当前画布显示尺寸
  const canvasRect = gameState.canvas.getBoundingClientRect();
  const displayWidth = canvasRect.width;
  const displayHeight = canvasRect.height;

  // 设置相机跟随玩家（考虑缩放）
  const cameraX = gameState.player.x - displayWidth / zoomFactor / 2;
  const cameraY = gameState.player.y - displayHeight / zoomFactor / 2;

  // 重置变换矩阵并清空整个画布
  gameState.ctx.setTransform(1, 0, 0, 1, 0, 0);
  gameState.ctx.clearRect(
    0,
    0,
    gameState.canvas.width,
    gameState.canvas.height
  );

  // 绘制背景，使用当前画布尺寸
  gameState.ctx.fillStyle = "#f0f0f0";
  gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

  // 应用相机变换和缩放
  gameState.ctx.setTransform(
    zoomFactor,
    0,
    0,
    zoomFactor,
    -cameraX * zoomFactor,
    -cameraY * zoomFactor
  );

  // 绘制网格
  drawGrid();

  // 绘制边界 - 使用地图尺寸而不是画布尺寸
  const mapSize = config.mapSizes[gameState.mapSize];
  gameState.ctx.strokeStyle = "#333";
  gameState.ctx.lineWidth = 5;
  gameState.ctx.strokeRect(0, 0, mapSize.width, mapSize.height);

  // 更新和绘制资源
  for (const resource of gameState.resources) {
    resource.draw();
  }

  // 绘制炸弹
  for (const bomb of gameState.bombs) {
    bomb.draw();
  }

  // 更新和绘制敌人
  for (const enemy of gameState.enemies) {
    enemy.update(deltaTime);
    enemy.draw();
  }

  // 更新和绘制玩家
  gameState.player.update(deltaTime);
  gameState.player.draw();

  // 继续游戏循环
  requestAnimationFrame(gameLoop);
}

// 绘制网格函数
function drawGrid() {
  // 使用中型地图的网格尺寸
  const gridSize = config.gridSize.medium;

  gameState.ctx.strokeStyle = "#e0e0e0";
  gameState.ctx.lineWidth = 1;

  // 计算网格起始点（基于相机位置）
  const startX =
    Math.floor(gameState.player.x / gridSize) * gridSize -
    gameState.canvas.width;
  const startY =
    Math.floor(gameState.player.y / gridSize) * gridSize -
    gameState.canvas.height;
  const endX =
    Math.ceil(gameState.player.x / gridSize) * gridSize +
    gameState.canvas.width;
  const endY =
    Math.ceil(gameState.player.y / gridSize) * gridSize +
    gameState.canvas.height;

  // 绘制垂直线
  for (let x = startX; x <= endX; x += gridSize) {
    gameState.ctx.beginPath();
    gameState.ctx.moveTo(x, startY);
    gameState.ctx.lineTo(x, endY);
    gameState.ctx.stroke();
  }

  // 绘制水平线
  for (let y = startY; y <= endY; y += gridSize) {
    gameState.ctx.beginPath();
    gameState.ctx.moveTo(startX, y);
    gameState.ctx.lineTo(endX, y);
    gameState.ctx.stroke();
  }
}

// 画布尺寸调整函数
function resizeCanvas() {
  const canvas = gameState.canvas;
  if (!canvas) return;

  // 获取窗口尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 始终使用窗口的完整尺寸
  canvas.width = windowWidth;
  canvas.height = windowHeight;
  canvas.style.width = windowWidth + "px";
  canvas.style.height = windowHeight + "px";

  // 不再根据窗口尺寸调整地图尺寸
  // 地图尺寸保持为配置中的固定值（中型地图为3000x3000）
}

// 初始化函数
function init() {
  gameState.canvas = document.getElementById("game-canvas");
  gameState.ctx = gameState.canvas.getContext("2d");

  // 设置默认地图尺寸为窗口尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 保持中型地图尺寸为3000x3000，不再根据窗口调整
  // 小型地图尺寸保持不变

  // 中型地图固定为3000x3000
  // 注意：config.mapSizes.medium已在配置中设置为3000x3000

  // 大型地图尺寸保持不变

  // 调整画布尺寸
  resizeCanvas();

  // 监听窗口尺寸变化
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);

  // 地图大小已固定为中型地图，不再需要选择按钮
  gameState.mapSize = "medium";

  // 控制方式选择按钮
  const controlButtons = document.querySelectorAll(".control-btn");
  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      controlButtons.forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
      gameState.controlType = button.dataset.control;
    });
  });

  // 开始游戏按钮
  document.getElementById("start-btn").addEventListener("click", startGame);

  // 重新开始按钮
  document.getElementById("restart-btn").addEventListener("click", resetGame);
  document
    .getElementById("restart-btn-victory")
    .addEventListener("click", resetGame);

  // 回到首页按钮
  document.getElementById("home-btn-fail").addEventListener("click", () => {
    document.getElementById("game-over-screen").style.display = "none";
    document.getElementById("game-container").style.display = "none";
    document.getElementById("start-screen").style.display = "flex";
  });

  document.getElementById("home-btn-victory").addEventListener("click", () => {
    document.getElementById("victory-screen").style.display = "none";
    document.getElementById("game-container").style.display = "none";
    document.getElementById("start-screen").style.display = "flex";
  });

  // 键盘控制
  window.addEventListener("keydown", (e) => {
    gameState.keysPressed[e.key] = true;
  });

  window.addEventListener("keyup", (e) => {
    gameState.keysPressed[e.key] = false;
  });

  // 虚拟摇杆控制
  const joystickContainer = document.getElementById("joystick-container");
  const joystick = document.getElementById("joystick");

  joystickContainer.addEventListener("touchstart", handleJoystickStart);
  joystickContainer.addEventListener("touchmove", handleJoystickMove);
  joystickContainer.addEventListener("touchend", handleJoystickEnd);

  // 鼠标控制（用于测试虚拟摇杆）
  joystickContainer.addEventListener("mousedown", handleJoystickStart);
  window.addEventListener("mousemove", handleJoystickMove);
  window.addEventListener("mouseup", handleJoystickEnd);

  function handleJoystickStart(e) {
    e.preventDefault();
    gameState.joystickActive = true;
  }

  function handleJoystickMove(e) {
    e.preventDefault();
    if (!gameState.joystickActive) return;

    let clientX, clientY;

    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // 计算角度和强度
    gameState.joystickAngle = Math.atan2(deltaY, deltaX);

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2;
    gameState.joystickStrength = Math.min(distance / maxDistance, 1);

    // 更新摇杆位置
    const joystickX =
      Math.cos(gameState.joystickAngle) *
      gameState.joystickStrength *
      maxDistance;
    const joystickY =
      Math.sin(gameState.joystickAngle) *
      gameState.joystickStrength *
      maxDistance;

    joystick.style.transform = `translate(calc(-50% + ${joystickX}px), calc(-50% + ${joystickY}px))`;
  }

  function handleJoystickEnd(e) {
    e.preventDefault();
    gameState.joystickActive = false;
    gameState.joystickStrength = 0;
    joystick.style.transform = "translate(-50%, -50%)";
  }

  // 窗口大小调整
  window.addEventListener("resize", () => {
    if (!gameState.isRunning) {
      gameState.canvas.width = window.innerWidth;
      gameState.canvas.height = window.innerHeight;
    }
  });
}

// 当页面加载完成后初始化游戏
window.addEventListener("load", init);
