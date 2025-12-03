// ==========================================
// SPACE INVADERS RETRO - JUEGO DE DISPAROS
// Temática: Videojuegos retro de los años 80
// ==========================================

// ==========================================
// CONFIGURACIÓN DEL JUEGO
// ==========================================
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 500,
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 40,
    PLAYER_SPEED: 7,
    PLAYER_BULLET_SPEED: 10,
    PLAYER_BULLET_WIDTH: 4,
    PLAYER_BULLET_HEIGHT: 15,
    PLAYER_SHOOT_COOLDOWN: 250,
    ENEMY_WIDTH: 40,
    ENEMY_HEIGHT: 30,
    ENEMY_ROWS: 3,
    ENEMY_COLS: 8,
    ENEMY_PADDING: 15,
    ENEMY_TOP_OFFSET: 50,
    ENEMY_MOVE_SPEED: 1,
    ENEMY_DROP_DISTANCE: 20,
    ENEMY_BULLET_WIDTH: 4,
    ENEMY_BULLET_HEIGHT: 12,
    TOTAL_LEVELS: 10,
    INITIAL_LIVES: 3,
    POINTS_PER_ENEMY: 10,
    POINTS_PER_LEVEL_BONUS: 500
};

// ==========================================
// ESTADO DEL JUEGO
// ==========================================
let gameState = {
    isRunning: false,
    isPaused: false,
    currentLevel: 1,
    score: 0,
    lives: CONFIG.INITIAL_LIVES,
    player: null,
    playerBullets: [],
    enemies: [],
    enemyBullets: [],
    enemyDirection: 1,
    lastPlayerShot: 0,
    lastEnemyShot: 0,
    enemyShootInterval: 2000,
    keys: {}
};

// ==========================================
// REFERENCIAS DEL DOM
// ==========================================
let canvas, ctx;
let startMenu, pauseMenu, victoryMenu, defeatMenu, gameContainer;
let levelDisplay, scoreDisplay, livesDisplay;

// ==========================================
// INICIALIZACIÓN
// ==========================================
function init() {
    // Obtener referencias del DOM
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    startMenu = document.getElementById('start-menu');
    pauseMenu = document.getElementById('pause-menu');
    victoryMenu = document.getElementById('victory-menu');
    defeatMenu = document.getElementById('defeat-menu');
    gameContainer = document.getElementById('game-container');
    
    levelDisplay = document.getElementById('level');
    scoreDisplay = document.getElementById('score');
    livesDisplay = document.getElementById('lives');
    
    // Configurar canvas
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Configurar eventos de botones
    setupButtonEvents();
    
    // Configurar eventos de teclado
    setupKeyboardEvents();
    
    // Mostrar menú de inicio
    showStartMenu();
}

// ==========================================
// CONFIGURACIÓN DE EVENTOS
// ==========================================
function setupButtonEvents() {
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('restart-pause-btn').addEventListener('click', restartGame);
    document.getElementById('quit-btn').addEventListener('click', quitToMenu);
    document.getElementById('play-again-btn').addEventListener('click', restartGame);
    document.getElementById('victory-menu-btn').addEventListener('click', quitToMenu);
    document.getElementById('retry-btn').addEventListener('click', restartGame);
    document.getElementById('defeat-menu-btn').addEventListener('click', quitToMenu);
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.code] = true;
        
        // Pausar juego
        if ((e.code === 'KeyP' || e.code === 'Escape') && gameState.isRunning && !gameState.isPaused) {
            pauseGame();
        } else if ((e.code === 'KeyP' || e.code === 'Escape') && gameState.isPaused) {
            resumeGame();
        }
        
        // Prevenir scroll con las flechas y espacio
        if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        gameState.keys[e.code] = false;
    });
}

// ==========================================
// CONTROL DE MENÚS
// ==========================================
function showStartMenu() {
    startMenu.classList.remove('hidden');
    pauseMenu.classList.add('hidden');
    victoryMenu.classList.add('hidden');
    defeatMenu.classList.add('hidden');
    gameContainer.classList.add('hidden');
}

function showPauseMenu() {
    pauseMenu.classList.remove('hidden');
}

function hidePauseMenu() {
    pauseMenu.classList.add('hidden');
}

function showVictoryMenu() {
    document.getElementById('final-score').textContent = `PUNTUACIÓN: ${gameState.score}`;
    victoryMenu.classList.remove('hidden');
}

function showDefeatMenu() {
    document.getElementById('defeat-level').textContent = `NIVEL ALCANZADO: ${gameState.currentLevel}`;
    document.getElementById('defeat-score').textContent = `PUNTUACIÓN: ${gameState.score}`;
    defeatMenu.classList.remove('hidden');
}

// ==========================================
// CONTROL DEL JUEGO
// ==========================================
function startGame() {
    startMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    resetGameState();
    initLevel();
    gameState.isRunning = true;
    gameLoop();
}

function pauseGame() {
    gameState.isPaused = true;
    showPauseMenu();
}

function resumeGame() {
    gameState.isPaused = false;
    hidePauseMenu();
    gameLoop();
}

function restartGame() {
    pauseMenu.classList.add('hidden');
    victoryMenu.classList.add('hidden');
    defeatMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    resetGameState();
    initLevel();
    gameState.isRunning = true;
    gameLoop();
}

function quitToMenu() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    showStartMenu();
}

function resetGameState() {
    gameState.currentLevel = 1;
    gameState.score = 0;
    gameState.lives = CONFIG.INITIAL_LIVES;
    gameState.playerBullets = [];
    gameState.enemyBullets = [];
    gameState.enemyDirection = 1;
    gameState.lastPlayerShot = 0;
    gameState.lastEnemyShot = 0;
    updateHUD();
}

// ==========================================
// INICIALIZACIÓN DE NIVEL
// ==========================================
function initLevel() {
    // Crear jugador
    gameState.player = {
        x: CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2,
        y: CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_HEIGHT - 20,
        width: CONFIG.PLAYER_WIDTH,
        height: CONFIG.PLAYER_HEIGHT
    };
    
    // Crear enemigos
    createEnemies();
    
    // Limpiar balas
    gameState.playerBullets = [];
    gameState.enemyBullets = [];
    
    // Ajustar dificultad según nivel
    adjustDifficulty();
    
    updateHUD();
}

function createEnemies() {
    gameState.enemies = [];
    
    const totalWidth = CONFIG.ENEMY_COLS * (CONFIG.ENEMY_WIDTH + CONFIG.ENEMY_PADDING) - CONFIG.ENEMY_PADDING;
    const startX = (CONFIG.CANVAS_WIDTH - totalWidth) / 2;
    
    for (let row = 0; row < CONFIG.ENEMY_ROWS; row++) {
        for (let col = 0; col < CONFIG.ENEMY_COLS; col++) {
            gameState.enemies.push({
                x: startX + col * (CONFIG.ENEMY_WIDTH + CONFIG.ENEMY_PADDING),
                y: CONFIG.ENEMY_TOP_OFFSET + row * (CONFIG.ENEMY_HEIGHT + CONFIG.ENEMY_PADDING),
                width: CONFIG.ENEMY_WIDTH,
                height: CONFIG.ENEMY_HEIGHT,
                type: row // Diferentes tipos de enemigos por fila
            });
        }
    }
}

function adjustDifficulty() {
    // Cuanto más alto el nivel, más rápido disparan los enemigos
    const baseInterval = 2000;
    const minInterval = 400;
    const reduction = (baseInterval - minInterval) / (CONFIG.TOTAL_LEVELS - 1);
    gameState.enemyShootInterval = baseInterval - (gameState.currentLevel - 1) * reduction;
}

// ==========================================
// BUCLE PRINCIPAL DEL JUEGO
// ==========================================
function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

// ==========================================
// ACTUALIZACIÓN DEL JUEGO
// ==========================================
function update() {
    updatePlayer();
    updatePlayerBullets();
    updateEnemies();
    updateEnemyBullets();
    checkCollisions();
    enemyShoot();
}

function updatePlayer() {
    const player = gameState.player;
    
    // Movimiento
    if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) {
        player.x -= CONFIG.PLAYER_SPEED;
    }
    if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) {
        player.x += CONFIG.PLAYER_SPEED;
    }
    
    // Límites del canvas
    player.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - player.width, player.x));
    
    // Disparar
    if (gameState.keys['Space']) {
        playerShoot();
    }
}

function playerShoot() {
    const now = Date.now();
    if (now - gameState.lastPlayerShot < CONFIG.PLAYER_SHOOT_COOLDOWN) return;
    
    gameState.lastPlayerShot = now;
    
    gameState.playerBullets.push({
        x: gameState.player.x + gameState.player.width / 2 - CONFIG.PLAYER_BULLET_WIDTH / 2,
        y: gameState.player.y,
        width: CONFIG.PLAYER_BULLET_WIDTH,
        height: CONFIG.PLAYER_BULLET_HEIGHT
    });
}

function updatePlayerBullets() {
    // Actualizar posición de las balas
    gameState.playerBullets.forEach(bullet => {
        bullet.y -= CONFIG.PLAYER_BULLET_SPEED;
    });
    
    // Eliminar balas fuera de pantalla usando filter
    gameState.playerBullets = gameState.playerBullets.filter(
        bullet => bullet.y + bullet.height >= 0
    );
}

function updateEnemies() {
    if (gameState.enemies.length === 0) return;
    
    // Calcular movimiento
    let shouldChangeDirection = false;
    const speed = CONFIG.ENEMY_MOVE_SPEED + (gameState.currentLevel - 1) * 0.3;
    
    // Verificar límites
    gameState.enemies.forEach(enemy => {
        if (enemy.x + enemy.width + speed * gameState.enemyDirection > CONFIG.CANVAS_WIDTH ||
            enemy.x + speed * gameState.enemyDirection < 0) {
            shouldChangeDirection = true;
        }
    });
    
    // Mover enemigos
    if (shouldChangeDirection) {
        gameState.enemyDirection *= -1;
        gameState.enemies.forEach(enemy => {
            enemy.y += CONFIG.ENEMY_DROP_DISTANCE;
        });
    } else {
        gameState.enemies.forEach(enemy => {
            enemy.x += speed * gameState.enemyDirection;
        });
    }
    
    // Verificar si los enemigos llegaron al jugador
    gameState.enemies.forEach(enemy => {
        if (enemy.y + enemy.height >= gameState.player.y) {
            gameOver();
        }
    });
}

function enemyShoot() {
    const now = Date.now();
    if (now - gameState.lastEnemyShot < gameState.enemyShootInterval) return;
    if (gameState.enemies.length === 0) return;
    
    gameState.lastEnemyShot = now;
    
    // Seleccionar un enemigo aleatorio para disparar
    const randomEnemy = gameState.enemies[Math.floor(Math.random() * gameState.enemies.length)];
    
    // Velocidad de bala enemiga aumenta con el nivel
    const bulletSpeed = 4 + (gameState.currentLevel - 1) * 0.5;
    
    gameState.enemyBullets.push({
        x: randomEnemy.x + randomEnemy.width / 2 - CONFIG.ENEMY_BULLET_WIDTH / 2,
        y: randomEnemy.y + randomEnemy.height,
        width: CONFIG.ENEMY_BULLET_WIDTH,
        height: CONFIG.ENEMY_BULLET_HEIGHT,
        speed: bulletSpeed
    });
}

function updateEnemyBullets() {
    // Actualizar posición de las balas enemigas
    gameState.enemyBullets.forEach(bullet => {
        bullet.y += bullet.speed;
    });
    
    // Eliminar balas fuera de pantalla usando filter
    gameState.enemyBullets = gameState.enemyBullets.filter(
        bullet => bullet.y <= CONFIG.CANVAS_HEIGHT
    );
}

// ==========================================
// DETECCIÓN DE COLISIONES
// ==========================================
function checkCollisions() {
    // Balas del jugador vs enemigos - usar bucle inverso para modificación segura
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();
    
    for (let i = gameState.playerBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.playerBullets[i];
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            if (isColliding(bullet, enemy)) {
                bulletsToRemove.add(i);
                enemiesToRemove.add(j);
                
                // Añadir puntos
                gameState.score += CONFIG.POINTS_PER_ENEMY * gameState.currentLevel;
                break; // Una bala solo puede destruir un enemigo
            }
        }
    }
    
    // Eliminar balas y enemigos marcados
    gameState.playerBullets = gameState.playerBullets.filter((_, i) => !bulletsToRemove.has(i));
    gameState.enemies = gameState.enemies.filter((_, i) => !enemiesToRemove.has(i));
    
    if (enemiesToRemove.size > 0) {
        updateHUD();
        
        // Verificar si se eliminaron todos los enemigos
        if (gameState.enemies.length === 0) {
            nextLevel();
        }
    }
    
    // Balas enemigas vs jugador - usar bucle inverso
    const enemyBulletsToRemove = new Set();
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        if (isColliding(gameState.enemyBullets[i], gameState.player)) {
            enemyBulletsToRemove.add(i);
            playerHit();
        }
    }
    
    gameState.enemyBullets = gameState.enemyBullets.filter((_, i) => !enemyBulletsToRemove.has(i));
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function playerHit() {
    gameState.lives--;
    updateHUD();
    
    // Efecto visual de daño
    canvas.classList.add('damage-flash');
    setTimeout(() => canvas.classList.remove('damage-flash'), 200);
    
    if (gameState.lives <= 0) {
        gameOver();
    }
}

// ==========================================
// PROGRESIÓN DEL JUEGO
// ==========================================
function nextLevel() {
    gameState.currentLevel++;
    
    // Bonus por completar nivel
    gameState.score += CONFIG.POINTS_PER_LEVEL_BONUS;
    
    if (gameState.currentLevel > CONFIG.TOTAL_LEVELS) {
        victory();
    } else {
        initLevel();
    }
}

function victory() {
    gameState.isRunning = false;
    showVictoryMenu();
}

function gameOver() {
    gameState.isRunning = false;
    showDefeatMenu();
}

// ==========================================
// ACTUALIZACIÓN DEL HUD
// ==========================================
function updateHUD() {
    levelDisplay.textContent = gameState.currentLevel;
    scoreDisplay.textContent = gameState.score;
    livesDisplay.textContent = '❤'.repeat(Math.max(0, gameState.lives));
}

// ==========================================
// RENDERIZADO
// ==========================================
function render() {
    // Limpiar canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Dibujar fondo con estrellas
    drawBackground();
    
    // Dibujar jugador
    drawPlayer();
    
    // Dibujar balas del jugador
    drawPlayerBullets();
    
    // Dibujar enemigos
    drawEnemies();
    
    // Dibujar balas enemigas
    drawEnemyBullets();
}

function drawBackground() {
    // Efecto de scan lines retro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CONFIG.CANVAS_WIDTH, 2);
    }
}

function drawPlayer() {
    const player = gameState.player;
    
    // Cuerpo de la nave
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    
    // Forma de nave triangular
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.75, player.y + player.height - 10);
    ctx.lineTo(player.x + player.width * 0.25, player.y + player.height - 10);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Cabina
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height * 0.4, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Motor (efecto de llama)
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width * 0.35, player.y + player.height - 5);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height + 10 + Math.random() * 5);
    ctx.lineTo(player.x + player.width * 0.65, player.y + player.height - 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawPlayerBullets() {
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    
    gameState.playerBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    gameState.enemies.forEach(enemy => {
        drawEnemy(enemy);
    });
}

function drawEnemy(enemy) {
    // Colores según el tipo de enemigo
    const colors = ['#ff0066', '#ff6600', '#ffff00'];
    const color = colors[enemy.type % colors.length];
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    
    // Cuerpo del enemigo (forma de alien pixelado)
    const x = enemy.x;
    const y = enemy.y;
    const w = enemy.width;
    const h = enemy.height;
    
    // Forma básica de alien
    ctx.beginPath();
    
    // Cabeza
    ctx.moveTo(x + w * 0.3, y);
    ctx.lineTo(x + w * 0.7, y);
    ctx.lineTo(x + w * 0.8, y + h * 0.3);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.85, y + h * 0.7);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.lineTo(x + w * 0.3, y + h);
    ctx.lineTo(x + w * 0.15, y + h * 0.7);
    ctx.lineTo(x, y + h * 0.5);
    ctx.lineTo(x + w * 0.2, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Ojos
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.fillRect(x + w * 0.25, y + h * 0.3, w * 0.15, h * 0.2);
    ctx.fillRect(x + w * 0.6, y + h * 0.3, w * 0.15, h * 0.2);
    
    // Brillo de ojos
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.28, y + h * 0.32, w * 0.08, h * 0.1);
    ctx.fillRect(x + w * 0.63, y + h * 0.32, w * 0.08, h * 0.1);
}

function drawEnemyBullets() {
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    
    gameState.enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    ctx.shadowBlur = 0;
}

// ==========================================
// INICIAR CUANDO EL DOM ESTÉ LISTO
// ==========================================
document.addEventListener('DOMContentLoaded', init);
