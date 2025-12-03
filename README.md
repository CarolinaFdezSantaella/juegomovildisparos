# Space Invaders Retro - Juego de Disparos

Un juego de disparos estilo Space Invaders desarrollado con React Native y Expo.

## Características

- 🎮 10 niveles de dificultad progresiva
- 🚀 Controles táctiles optimizados para móvil
- 🎨 Estilo retro de los años 80 con efectos de neón
- 💥 Sistema de puntuación y vidas
- 📱 Compatible con iOS, Android y Web

## Requisitos

- Node.js 18+
- npm o yarn
- Expo CLI (se instala automáticamente)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/CarolinaFdezSantaella/juegomovildisparos.git

# Entrar al directorio
cd juegomovildisparos

# Instalar dependencias
npm install
```

## Ejecución

```bash
# Iniciar el servidor de desarrollo
npm start

# Ejecutar en navegador web
npm run web

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios
```

## Controles

### Móvil (Touch)
- **◀ / ▶**: Mover la nave izquierda/derecha
- **🔴**: Disparar
- **⏸**: Pausar el juego

### Teclado (Web)
- **← / →** o **A / D**: Mover la nave
- **Espacio**: Disparar
- **P / ESC**: Pausar

## Tecnologías

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Estructura del Proyecto

```
juegomovildisparos/
├── App.tsx          # Componente principal del juego
├── app.json         # Configuración de Expo
├── package.json     # Dependencias
├── tsconfig.json    # Configuración de TypeScript
└── assets/          # Recursos del juego (iconos, etc.)
```

## Licencia

ISC © 2024 RETRO GAMES