// 导入图片资源
import { dog1Url } from '../img/dog/dog1.js';
import { cat1Url } from '../img/cat/cat1.js';
import { cat2Url } from '../img/cat/cat2.js';
import { cat3Url } from '../img/cat/cat3.js';
import { cat4Url } from '../img/cat/cat4.js';
import { cat5Url } from '../img/cat/cat5.js';
import { cat6Url } from '../img/cat/cat6.js';

// 游戏配置
const config = {
    mapSizes: {
        small: { width: 1000, height: 1000 },
        medium: { width: 2500, height: 2500 },
        large: { width: 5000, height: 5000 }
    },
    initialSpeeds: {
        small: 120,
        medium: 100,
        large: 80
    },
    playerInitialSize: 30,
    minSpeed: 20,
    safeDistance: 100,
    enemyCounts: {
        small: 10,
        medium: 25,
        large: 50
    },
    resourceDensity: 0.75, // 地图资源密度，确保3/4的地图布满资源
    resourceGenerationRate: 1000, // 每秒生成资源的速率（毫秒）
};

// 游戏状态
let gameState = {
    mapSize: 'small',
    controlType: 'keyboard',
    isRunning: false,
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    resources: [],
    keysPressed: {},
    joystickActive: false,
    joystickAngle: 0,
    joystickStrength: 0,
    lastTime: 0,
    resourceTimer: 0
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

        if (gameState.controlType === 'keyboard') {
            if (gameState.keysPressed['w'] || gameState.keysPressed['ArrowUp']) dy -= 1;
            if (gameState.keysPressed['s'] || gameState.keysPressed['ArrowDown']) dy += 1;
            if (gameState.keysPressed['a'] || gameState.keysPressed['ArrowLeft']) dx -= 1;
            if (gameState.keysPressed['d'] || gameState.keysPressed['ArrowRight']) dx += 1;

            // 归一化对角线移动
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }
        } else if (gameState.controlType === 'joystick' && gameState.joystickActive) {
            dx = Math.cos(gameState.joystickAngle) * gameState.joystickStrength;
            dy = Math.sin(gameState.joystickAngle) * gameState.joystickStrength;
        }

        // 计算当前速度
        const currentSpeed = this.calculateSpeed();

        // 更新位置
        this.x += dx * currentSpeed * deltaTime;
        this.y += dy * currentSpeed * deltaTime;

        // 边界检查
        this.x = Math.max(this.size / 2, Math.min(gameState.canvas.width - this.size / 2, this.x));
        this.y = Math.max(this.size / 2, Math.min(gameState.canvas.height - this.size / 2, this.y));

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
            
            if (distance < (this.size / 2 + resource.size / 2)) {
                // 吃掉资源，增加大小
                this.size += resource.size / 5;
                gameState.resources.splice(i, 1);
            }
        }
    }
    
    checkEnemyCollisions() {
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            const distance = getDistance(this.x, this.y, enemy.x, enemy.y);
            
            if (distance < (this.size / 2 + enemy.size / 2)) {
                // 碰撞发生
                if (this.size > enemy.size) {
                    // 玩家吃掉敌人
                    this.size += enemy.size / 3;
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

    checkVictoryCondition() {
        const mapSize = config.mapSizes[gameState.mapSize];
        if (this.size >= mapSize.width) {
            victory();
        }
    }

    draw() {
        gameState.ctx.save();
        gameState.ctx.beginPath();
        gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        gameState.ctx.clip();
        gameState.ctx.drawImage(this.img, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        gameState.ctx.restore();
        
        // 绘制黑色边框
        gameState.ctx.beginPath();
        gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        gameState.ctx.strokeStyle = '#000000';
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
        this.speed = getInitialSpeed() * (0.9 + Math.random() * 0.1); // 初始速度比玩家随机减少0-10%
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

        // 边界检查
        this.x = Math.max(this.size / 2, Math.min(gameState.canvas.width - this.size / 2, this.x));
        this.y = Math.max(this.size / 2, Math.min(gameState.canvas.height - this.size / 2, this.y));

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
            const playerDistance = getDistance(this.x, this.y, gameState.player.x, gameState.player.y);
            if (playerDistance < config.safeDistance + this.size / 2 + gameState.player.size / 2) {
                nearbyEntities.push({
                    x: gameState.player.x,
                    y: gameState.player.y,
                    size: gameState.player.size,
                    distance: playerDistance
                });
            }
            
            // 检查其他敌人
            for (const enemy of gameState.enemies) {
                if (enemy !== this) {
                    const enemyDistance = getDistance(this.x, this.y, enemy.x, enemy.y);
                    if (enemyDistance < config.safeDistance + this.size / 2 + enemy.size / 2) {
                        nearbyEntities.push({
                            x: enemy.x,
                            y: enemy.y,
                            size: enemy.size,
                            distance: enemyDistance
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
                        const distance = getDistance(this.x, this.y, resource.x, resource.y);
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
            this.targetX = Math.max(this.size / 2, Math.min(gameState.canvas.width - this.size / 2, this.targetX));
            this.targetY = Math.max(this.size / 2, Math.min(gameState.canvas.height - this.size / 2, this.targetY));
        }
    }

    checkResourceCollisions() {
        for (let i = gameState.resources.length - 1; i >= 0; i--) {
            const resource = gameState.resources[i];
            const distance = getDistance(this.x, this.y, resource.x, resource.y);
            
            if (distance < (this.size / 2 + resource.size / 2)) {
                // 吃掉资源，增加大小
                this.size += resource.size / 5;
                gameState.resources.splice(i, 1);
            }
        }
    }
    
    checkEnemyCollisions() {
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            
            // 跳过自己
            if (enemy === this) continue;
            
            const distance = getDistance(this.x, this.y, enemy.x, enemy.y);
            
            if (distance < (this.size / 2 + enemy.size / 2)) {
                // 碰撞发生
                if (this.size > enemy.size) {
                    // 当前敌人吃掉另一个敌人
                    this.size += enemy.size / 3;
                    gameState.enemies.splice(i, 1);
                    spawnEnemy(); // 生成新敌人保持数量
                }
                // 注意：如果当前敌人较小，不需要处理，因为另一个敌人会处理这个碰撞
            }
        }
    }

    draw() {
        gameState.ctx.save();
        gameState.ctx.beginPath();
        gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        gameState.ctx.clip();
        gameState.ctx.drawImage(this.img, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        gameState.ctx.restore();
        
        // 绘制黑色边框
        gameState.ctx.beginPath();
        gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        gameState.ctx.strokeStyle = '#000000';
        gameState.ctx.lineWidth = 2;
        gameState.ctx.stroke();
    }
}

// 资源类
class Resource {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 10 + 5; // 资源大小随机5-15
        this.color = getRandomColor();
    }

    draw() {
        gameState.ctx.beginPath();
        gameState.ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        gameState.ctx.fillStyle = this.color;
        gameState.ctx.fill();
    }
}

// 辅助函数
function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function getRandomColor() {
    const colors = ['#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41', '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomCatImage() {
    const catImages = [cat1Url, cat2Url, cat3Url, cat4Url, cat5Url, cat6Url];
    return catImages[Math.floor(Math.random() * catImages.length)];
}

function createImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function getInitialSpeed() {
    return config.initialSpeeds[gameState.mapSize];
}

function spawnResources() {
    const mapSize = config.mapSizes[gameState.mapSize];
    const area = mapSize.width * mapSize.height;
    const resourceCount = Math.floor(area * config.resourceDensity / 1000); // 根据地图大小和密度计算资源数量
    
    for (let i = 0; i < resourceCount; i++) {
        const x = Math.random() * mapSize.width;
        const y = Math.random() * mapSize.height;
        gameState.resources.push(new Resource(x, y));
    }
}

function generateResource() {
    const mapSize = config.mapSizes[gameState.mapSize];
    const x = Math.random() * mapSize.width;
    const y = Math.random() * mapSize.height;
    gameState.resources.push(new Resource(x, y));
}

function spawnEnemy() {
    const mapSize = config.mapSizes[gameState.mapSize];
    let x, y;
    let isSafe = false;
    
    // 确保敌人生成位置与玩家保持安全距离
    while (!isSafe) {
        x = Math.random() * mapSize.width;
        y = Math.random() * mapSize.height;
        
        const distance = getDistance(x, y, gameState.player.x, gameState.player.y);
        if (distance > config.safeDistance + gameState.player.size / 2) {
            isSafe = true;
        }
    }
    
    // 随机大小，最小为玩家初始大小，最大为地图的1/16
    const minSize = config.playerInitialSize;
    const maxSize = Math.min(mapSize.width, mapSize.height) / 16;
    const size = Math.random() * (maxSize - minSize) + minSize;
    
    gameState.enemies.push(new Enemy(x, y, size));
}

function spawnEnemies() {
    const enemyCount = config.enemyCounts[gameState.mapSize];
    for (let i = 0; i < enemyCount; i++) {
        spawnEnemy();
    }
}

function gameOver() {
    gameState.isRunning = false;
    document.getElementById('game-over-screen').style.display = 'flex';
}

function victory() {
    gameState.isRunning = false;
    document.getElementById('victory-screen').style.display = 'flex';
}

function resetGame() {
    // 隐藏结束和胜利屏幕
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    
    // 重置游戏状态
    gameState.isRunning = true;
    gameState.resources = [];
    gameState.enemies = [];
    
    // 设置地图大小
    const mapSize = config.mapSizes[gameState.mapSize];
    gameState.canvas.width = mapSize.width;
    gameState.canvas.height = mapSize.height;
    
    // 创建玩家
    gameState.player = new Player(mapSize.width / 2, mapSize.height / 2, config.playerInitialSize);
    
    // 生成资源和敌人
    spawnResources();
    spawnEnemies();
    
    // 重置时间
    gameState.lastTime = performance.now();
    gameState.resourceTimer = 0;
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

function startGame() {
    // 隐藏开始屏幕，显示游戏容器
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    
    // 如果是虚拟摇杆控制，显示摇杆
    if (gameState.controlType === 'joystick') {
        document.getElementById('joystick-container').style.display = 'block';
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
    if (gameState.resourceTimer >= config.resourceGenerationRate) {
        gameState.resourceTimer = 0;
        generateResource();
    }
    
    // 清空画布
    gameState.ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // 设置相机跟随玩家
    const cameraX = gameState.player.x - window.innerWidth / 2;
    const cameraY = gameState.player.y - window.innerHeight / 2;
    gameState.ctx.setTransform(1, 0, 0, 1, -cameraX, -cameraY);
    
    // 绘制边界
    gameState.ctx.strokeStyle = '#333';
    gameState.ctx.lineWidth = 5;
    gameState.ctx.strokeRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    // 更新和绘制资源
    for (const resource of gameState.resources) {
        resource.draw();
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

// 初始化函数
function init() {
    // 获取画布和上下文
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // 设置画布大小为窗口大小
    gameState.canvas.width = window.innerWidth;
    gameState.canvas.height = window.innerHeight;
    
    // 地图大小选择按钮
    const mapSizeButtons = document.querySelectorAll('.map-size-btn');
    mapSizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            mapSizeButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameState.mapSize = button.dataset.size;
        });
    });
    
    // 控制方式选择按钮
    const controlButtons = document.querySelectorAll('.control-btn');
    controlButtons.forEach(button => {
        button.addEventListener('click', () => {
            controlButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameState.controlType = button.dataset.control;
        });
    });
    
    // 开始游戏按钮
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // 重新开始按钮
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('restart-btn-victory').addEventListener('click', resetGame);
    
    // 回到首页按钮
    document.getElementById('home-btn-fail').addEventListener('click', () => {
        document.getElementById('game-over-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    });
    
    document.getElementById('home-btn-victory').addEventListener('click', () => {
        document.getElementById('victory-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    });
    
    // 键盘控制
    window.addEventListener('keydown', (e) => {
        gameState.keysPressed[e.key] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        gameState.keysPressed[e.key] = false;
    });
    
    // 虚拟摇杆控制
    const joystickContainer = document.getElementById('joystick-container');
    const joystick = document.getElementById('joystick');
    
    joystickContainer.addEventListener('touchstart', handleJoystickStart);
    joystickContainer.addEventListener('touchmove', handleJoystickMove);
    joystickContainer.addEventListener('touchend', handleJoystickEnd);
    
    // 鼠标控制（用于测试虚拟摇杆）
    joystickContainer.addEventListener('mousedown', handleJoystickStart);
    window.addEventListener('mousemove', handleJoystickMove);
    window.addEventListener('mouseup', handleJoystickEnd);
    
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
        const joystickX = Math.cos(gameState.joystickAngle) * gameState.joystickStrength * maxDistance;
        const joystickY = Math.sin(gameState.joystickAngle) * gameState.joystickStrength * maxDistance;
        
        joystick.style.transform = `translate(calc(-50% + ${joystickX}px), calc(-50% + ${joystickY}px))`;
    }
    
    function handleJoystickEnd(e) {
        e.preventDefault();
        gameState.joystickActive = false;
        gameState.joystickStrength = 0;
        joystick.style.transform = 'translate(-50%, -50%)';
    }
    
    // 窗口大小调整
    window.addEventListener('resize', () => {
        if (!gameState.isRunning) {
            gameState.canvas.width = window.innerWidth;
            gameState.canvas.height = window.innerHeight;
        }
    });
}

// 当页面加载完成后初始化游戏
window.addEventListener('load', init);