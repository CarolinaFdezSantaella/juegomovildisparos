import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ==========================================
// CONFIGURACIÓN DEL JUEGO
// ==========================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_WIDTH = Math.min(SCREEN_WIDTH - 20, 400);
const GAME_HEIGHT = Math.min(SCREEN_HEIGHT - 200, 500);

const CONFIG = {
  CANVAS_WIDTH: GAME_WIDTH,
  CANVAS_HEIGHT: GAME_HEIGHT,
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
  ENEMY_COLS: 6,
  ENEMY_PADDING: 10,
  ENEMY_TOP_OFFSET: 30,
  ENEMY_MOVE_SPEED: 1,
  ENEMY_DROP_DISTANCE: 20,
  ENEMY_BULLET_WIDTH: 4,
  ENEMY_BULLET_HEIGHT: 12,
  TOTAL_LEVELS: 10,
  INITIAL_LIVES: 3,
  POINTS_PER_ENEMY: 10,
  POINTS_PER_LEVEL_BONUS: 500,
};

// ==========================================
// TIPOS
// ==========================================
interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Enemy extends Position {
  type: number;
}

interface Bullet extends Position {
  speed?: number;
}

interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  currentLevel: number;
  score: number;
  lives: number;
  player: Position | null;
  playerBullets: Bullet[];
  enemies: Enemy[];
  enemyBullets: Bullet[];
  enemyDirection: number;
  lastPlayerShot: number;
  lastEnemyShot: number;
  enemyShootInterval: number;
}

type MenuType = 'start' | 'pause' | 'victory' | 'defeat' | 'game';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function App() {
  const [currentMenu, setCurrentMenu] = useState<MenuType>('start');
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const keysRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({
    left: false,
    right: false,
    shoot: false,
  });

  // ==========================================
  // FUNCIONES DE ESTADO DEL JUEGO
  // ==========================================
  function createInitialGameState(): GameState {
    return {
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
    };
  }

  function createPlayer(): Position {
    return {
      x: CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2,
      y: CONFIG.CANVAS_HEIGHT - CONFIG.PLAYER_HEIGHT - 20,
      width: CONFIG.PLAYER_WIDTH,
      height: CONFIG.PLAYER_HEIGHT,
    };
  }

  function createEnemies(): Enemy[] {
    const enemies: Enemy[] = [];
    const totalWidth =
      CONFIG.ENEMY_COLS * (CONFIG.ENEMY_WIDTH + CONFIG.ENEMY_PADDING) - CONFIG.ENEMY_PADDING;
    const startX = (CONFIG.CANVAS_WIDTH - totalWidth) / 2;

    for (let row = 0; row < CONFIG.ENEMY_ROWS; row++) {
      for (let col = 0; col < CONFIG.ENEMY_COLS; col++) {
        enemies.push({
          x: startX + col * (CONFIG.ENEMY_WIDTH + CONFIG.ENEMY_PADDING),
          y: CONFIG.ENEMY_TOP_OFFSET + row * (CONFIG.ENEMY_HEIGHT + CONFIG.ENEMY_PADDING),
          width: CONFIG.ENEMY_WIDTH,
          height: CONFIG.ENEMY_HEIGHT,
          type: row,
        });
      }
    }
    return enemies;
  }

  // ==========================================
  // CONTROL DEL JUEGO
  // ==========================================
  const startGame = useCallback(() => {
    const newState = createInitialGameState();
    newState.isRunning = true;
    newState.player = createPlayer();
    newState.enemies = createEnemies();
    newState.enemyShootInterval = 2000;
    setGameState(newState);
    setCurrentMenu('game');
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: true }));
    setCurrentMenu('pause');
  }, []);

  const resumeGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: false }));
    setCurrentMenu('game');
  }, []);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const quitToMenu = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setGameState(createInitialGameState());
    setCurrentMenu('start');
  }, []);

  // ==========================================
  // LÓGICA DEL JUEGO
  // ==========================================
  const isColliding = (rect1: Position, rect2: Position): boolean => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  const updateGame = useCallback(() => {
    setGameState((prevState) => {
      if (!prevState.isRunning || prevState.isPaused || !prevState.player) {
        return prevState;
      }

      const newState = { ...prevState };
      const keys = keysRef.current;
      const now = Date.now();

      // Actualizar jugador
      const player = { ...newState.player! };
      if (keys.left) {
        player.x = Math.max(0, player.x - CONFIG.PLAYER_SPEED);
      }
      if (keys.right) {
        player.x = Math.min(CONFIG.CANVAS_WIDTH - player.width, player.x + CONFIG.PLAYER_SPEED);
      }
      newState.player = player;

      // Disparar jugador
      if (keys.shoot && now - newState.lastPlayerShot >= CONFIG.PLAYER_SHOOT_COOLDOWN) {
        newState.lastPlayerShot = now;
        newState.playerBullets = [
          ...newState.playerBullets,
          {
            x: player.x + player.width / 2 - CONFIG.PLAYER_BULLET_WIDTH / 2,
            y: player.y,
            width: CONFIG.PLAYER_BULLET_WIDTH,
            height: CONFIG.PLAYER_BULLET_HEIGHT,
          },
        ];
      }

      // Actualizar balas del jugador
      newState.playerBullets = newState.playerBullets
        .map((bullet) => ({ ...bullet, y: bullet.y - CONFIG.PLAYER_BULLET_SPEED }))
        .filter((bullet) => bullet.y + bullet.height >= 0);

      // Actualizar enemigos
      if (newState.enemies.length > 0) {
        const speed = CONFIG.ENEMY_MOVE_SPEED + (newState.currentLevel - 1) * 0.3;
        let shouldChangeDirection = false;

        for (const enemy of newState.enemies) {
          if (
            enemy.x + enemy.width + speed * newState.enemyDirection > CONFIG.CANVAS_WIDTH ||
            enemy.x + speed * newState.enemyDirection < 0
          ) {
            shouldChangeDirection = true;
            break;
          }
        }

        if (shouldChangeDirection) {
          newState.enemyDirection *= -1;
          newState.enemies = newState.enemies.map((enemy) => ({
            ...enemy,
            y: enemy.y + CONFIG.ENEMY_DROP_DISTANCE,
          }));
        } else {
          newState.enemies = newState.enemies.map((enemy) => ({
            ...enemy,
            x: enemy.x + speed * newState.enemyDirection,
          }));
        }

        // Verificar si los enemigos llegaron al jugador
        for (const enemy of newState.enemies) {
          if (enemy.y + enemy.height >= player.y) {
            newState.isRunning = false;
            return newState;
          }
        }
      }

      // Disparo de enemigos
      if (now - newState.lastEnemyShot >= newState.enemyShootInterval && newState.enemies.length > 0) {
        newState.lastEnemyShot = now;
        const randomEnemy = newState.enemies[Math.floor(Math.random() * newState.enemies.length)];
        const bulletSpeed = 4 + (newState.currentLevel - 1) * 0.5;
        newState.enemyBullets = [
          ...newState.enemyBullets,
          {
            x: randomEnemy.x + randomEnemy.width / 2 - CONFIG.ENEMY_BULLET_WIDTH / 2,
            y: randomEnemy.y + randomEnemy.height,
            width: CONFIG.ENEMY_BULLET_WIDTH,
            height: CONFIG.ENEMY_BULLET_HEIGHT,
            speed: bulletSpeed,
          },
        ];
      }

      // Actualizar balas enemigas
      newState.enemyBullets = newState.enemyBullets
        .map((bullet) => ({ ...bullet, y: bullet.y + (bullet.speed || 4) }))
        .filter((bullet) => bullet.y <= CONFIG.CANVAS_HEIGHT);

      // Colisiones: balas del jugador vs enemigos
      const bulletsToRemove = new Set<number>();
      const enemiesToRemove = new Set<number>();

      for (let i = newState.playerBullets.length - 1; i >= 0; i--) {
        const bullet = newState.playerBullets[i];
        for (let j = newState.enemies.length - 1; j >= 0; j--) {
          const enemy = newState.enemies[j];
          if (isColliding(bullet, enemy)) {
            bulletsToRemove.add(i);
            enemiesToRemove.add(j);
            newState.score += CONFIG.POINTS_PER_ENEMY * newState.currentLevel;
            break;
          }
        }
      }

      newState.playerBullets = newState.playerBullets.filter((_, i) => !bulletsToRemove.has(i));
      newState.enemies = newState.enemies.filter((_, i) => !enemiesToRemove.has(i));

      // Verificar si se eliminaron todos los enemigos
      if (newState.enemies.length === 0) {
        newState.currentLevel++;
        newState.score += CONFIG.POINTS_PER_LEVEL_BONUS;

        if (newState.currentLevel > CONFIG.TOTAL_LEVELS) {
          newState.isRunning = false;
        } else {
          newState.enemies = createEnemies();
          newState.playerBullets = [];
          newState.enemyBullets = [];
          const baseInterval = 2000;
          const minInterval = 400;
          const reduction = (baseInterval - minInterval) / (CONFIG.TOTAL_LEVELS - 1);
          newState.enemyShootInterval = baseInterval - (newState.currentLevel - 1) * reduction;
        }
      }

      // Colisiones: balas enemigas vs jugador
      const enemyBulletsToRemove = new Set<number>();
      for (let i = newState.enemyBullets.length - 1; i >= 0; i--) {
        if (isColliding(newState.enemyBullets[i], player)) {
          enemyBulletsToRemove.add(i);
          newState.lives--;
          if (newState.lives <= 0) {
            newState.isRunning = false;
          }
        }
      }
      newState.enemyBullets = newState.enemyBullets.filter((_, i) => !enemyBulletsToRemove.has(i));

      return newState;
    });
  }, []);

  // Game loop effect
  useEffect(() => {
    if (currentMenu !== 'game' || !gameState.isRunning || gameState.isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= 16) { // ~60fps
        updateGame();
        lastUpdateRef.current = now;
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [currentMenu, gameState.isRunning, gameState.isPaused, updateGame]);

  // Check for game over/victory
  useEffect(() => {
    if (currentMenu === 'game' && !gameState.isRunning && gameState.player) {
      if (gameState.currentLevel > CONFIG.TOTAL_LEVELS) {
        setCurrentMenu('victory');
      } else if (gameState.lives <= 0) {
        setCurrentMenu('defeat');
      } else {
        // Enemies reached player
        setCurrentMenu('defeat');
      }
    }
  }, [currentMenu, gameState.isRunning, gameState.player, gameState.currentLevel, gameState.lives]);

  // ==========================================
  // RENDERIZADO
  // ==========================================
  const renderStartMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.menuContent}>
        <Text style={styles.gameTitle}>SPACE INVADERS</Text>
        <Text style={styles.subtitle}>RETRO 80s</Text>
        <Text style={styles.instructions}>
          ← → MOVER NAVE{'\n'}
          🔴 DISPARAR{'\n'}
          ⏸ PAUSAR
        </Text>
        <TouchableOpacity style={styles.retroBtn} onPress={startGame}>
          <Text style={styles.retroBtnText}>INICIAR JUEGO</Text>
        </TouchableOpacity>
        <Text style={styles.credits}>© 2024 RETRO GAMES</Text>
      </View>
    </View>
  );

  const renderPauseMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.menuContent}>
        <Text style={styles.pauseTitle}>PAUSA</Text>
        <TouchableOpacity style={styles.retroBtn} onPress={resumeGame}>
          <Text style={styles.retroBtnText}>CONTINUAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retroBtn} onPress={restartGame}>
          <Text style={styles.retroBtnText}>REINICIAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retroBtn} onPress={quitToMenu}>
          <Text style={styles.retroBtnText}>MENÚ PRINCIPAL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVictoryMenu = () => (
    <View style={styles.menuContainer}>
      <View style={[styles.menuContent, styles.victoryContent]}>
        <Text style={styles.victoryTitle}>¡VICTORIA!</Text>
        <Text style={styles.victoryText}>HAS COMPLETADO LOS 10 NIVELES</Text>
        <Text style={styles.scoreText}>PUNTUACIÓN: {gameState.score}</Text>
        <TouchableOpacity style={styles.retroBtn} onPress={restartGame}>
          <Text style={styles.retroBtnText}>JUGAR DE NUEVO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retroBtn} onPress={quitToMenu}>
          <Text style={styles.retroBtnText}>MENÚ PRINCIPAL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDefeatMenu = () => (
    <View style={styles.menuContainer}>
      <View style={[styles.menuContent, styles.defeatContent]}>
        <Text style={styles.defeatTitle}>GAME OVER</Text>
        <Text style={styles.defeatText}>NIVEL ALCANZADO: {gameState.currentLevel}</Text>
        <Text style={styles.scoreText}>PUNTUACIÓN: {gameState.score}</Text>
        <TouchableOpacity style={styles.retroBtn} onPress={restartGame}>
          <Text style={styles.retroBtnText}>REINTENTAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retroBtn} onPress={quitToMenu}>
          <Text style={styles.retroBtnText}>MENÚ PRINCIPAL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayer = () => {
    if (!gameState.player) return null;
    const { x, y, width, height } = gameState.player;
    return (
      <View
        style={[
          styles.player,
          {
            left: x,
            top: y,
            width: width,
            height: height,
          },
        ]}
      >
        <View style={styles.playerBody} />
        <View style={styles.playerCabin} />
        <View style={styles.playerFlame} />
      </View>
    );
  };

  const renderEnemies = () => {
    return gameState.enemies.map((enemy, index) => {
      const colors = ['#ff0066', '#ff6600', '#ffff00'];
      const color = colors[enemy.type % colors.length];
      return (
        <View
          key={index}
          style={[
            styles.enemy,
            {
              left: enemy.x,
              top: enemy.y,
              width: enemy.width,
              height: enemy.height,
              backgroundColor: color,
            },
          ]}
        >
          <View style={[styles.enemyEye, { left: '20%' }]} />
          <View style={[styles.enemyEye, { right: '20%' }]} />
        </View>
      );
    });
  };

  const renderPlayerBullets = () => {
    return gameState.playerBullets.map((bullet, index) => (
      <View
        key={`pb-${index}`}
        style={[
          styles.playerBullet,
          {
            left: bullet.x,
            top: bullet.y,
            width: bullet.width,
            height: bullet.height,
          },
        ]}
      />
    ));
  };

  const renderEnemyBullets = () => {
    return gameState.enemyBullets.map((bullet, index) => (
      <View
        key={`eb-${index}`}
        style={[
          styles.enemyBullet,
          {
            left: bullet.x,
            top: bullet.y,
            width: bullet.width,
            height: bullet.height,
          },
        ]}
      />
    ));
  };

  const renderGameScreen = () => (
    <View style={styles.gameContainer}>
      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>NIVEL</Text>
          <Text style={styles.hudValue}>{gameState.currentLevel}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>PUNTOS</Text>
          <Text style={styles.hudValue}>{gameState.score}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>VIDAS</Text>
          <Text style={styles.hudValue}>{'❤'.repeat(Math.max(0, gameState.lives))}</Text>
        </View>
      </View>

      {/* Game Canvas */}
      <View style={styles.gameCanvas}>
        {renderPlayer()}
        {renderEnemies()}
        {renderPlayerBullets()}
        {renderEnemyBullets()}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.moveControls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPressIn={() => (keysRef.current.left = true)}
            onPressOut={() => (keysRef.current.left = false)}
          >
            <Text style={styles.controlBtnText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPressIn={() => (keysRef.current.right = true)}
            onPressOut={() => (keysRef.current.right = false)}
          >
            <Text style={styles.controlBtnText}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionControls}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.shootBtn]}
            onPressIn={() => (keysRef.current.shoot = true)}
            onPressOut={() => (keysRef.current.shoot = false)}
          >
            <Text style={styles.controlBtnText}>🔴</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.pauseBtn]} onPress={pauseGame}>
            <Text style={styles.controlBtnText}>⏸</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentMenu === 'start' && renderStartMenu()}
      {currentMenu === 'pause' && renderPauseMenu()}
      {currentMenu === 'victory' && renderVictoryMenu()}
      {currentMenu === 'defeat' && renderDefeatMenu()}
      {currentMenu === 'game' && renderGameScreen()}
    </View>
  );
}

// ==========================================
// ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menu styles
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    width: '100%',
  },
  menuContent: {
    backgroundColor: '#1a0a2e',
    borderWidth: 4,
    borderColor: '#ff00ff',
    padding: 40,
    alignItems: 'center',
    shadowColor: '#ff00ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  victoryContent: {
    borderColor: '#00ff00',
    shadowColor: '#00ff00',
  },
  defeatContent: {
    borderColor: '#ff0000',
    shadowColor: '#ff0000',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ffff',
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 10,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ff00ff',
    textShadowColor: '#ff00ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 30,
    letterSpacing: 8,
  },
  instructions: {
    color: '#ffff00',
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: '#ffff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  retroBtn: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    borderWidth: 3,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  retroBtnText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  credits: {
    color: '#666',
    fontSize: 10,
    marginTop: 30,
    letterSpacing: 2,
  },
  pauseTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffff00',
    textShadowColor: '#ffff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 30,
    letterSpacing: 4,
  },
  victoryTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff00',
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 20,
  },
  victoryText: {
    color: '#00ffff',
    fontSize: 14,
    marginBottom: 15,
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  defeatTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff0000',
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 20,
  },
  defeatText: {
    color: '#ff6666',
    fontSize: 14,
    marginBottom: 15,
    textShadowColor: '#ff6666',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  scoreText: {
    color: '#ffff00',
    fontSize: 18,
    marginBottom: 25,
    textShadowColor: '#ffff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Game styles
  gameContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: GAME_WIDTH,
    padding: 15,
    backgroundColor: 'rgba(26, 10, 46, 0.9)',
    borderWidth: 3,
    borderColor: '#ff00ff',
    borderBottomWidth: 0,
    shadowColor: '#ff00ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  hudItem: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 10,
    color: '#888',
    letterSpacing: 2,
    marginBottom: 5,
  },
  hudValue: {
    fontSize: 16,
    color: '#00ffff',
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 2,
  },
  gameCanvas: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0a0a1a',
    borderWidth: 3,
    borderColor: '#ff00ff',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#ff00ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  // Game entities
  player: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBody: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  playerCabin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff00ff',
    top: 15,
  },
  playerFlame: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ff6600',
    bottom: -15,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  enemy: {
    position: 'absolute',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  enemyEye: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#000',
    borderRadius: 4,
    top: '30%',
  },
  playerBullet: {
    position: 'absolute',
    backgroundColor: '#00ff00',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  enemyBullet: {
    position: 'absolute',
    backgroundColor: '#ff0000',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: GAME_WIDTH,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  moveControls: {
    flexDirection: 'row',
    columnGap: 10,
  },
  actionControls: {
    flexDirection: 'row',
    columnGap: 10,
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderWidth: 3,
    borderColor: '#00ffff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  shootBtn: {
    borderColor: '#ff0000',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    shadowColor: '#ff0000',
  },
  pauseBtn: {
    borderColor: '#ffff00',
    backgroundColor: 'rgba(255, 255, 0, 0.1)',
    shadowColor: '#ffff00',
  },
  controlBtnText: {
    fontSize: 24,
    color: '#fff',
  },
});
