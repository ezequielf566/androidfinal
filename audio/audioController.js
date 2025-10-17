// 🎵 Controle global de áudio de fundo
const audioFundo = new Audio('audio/fundo.mp3');
audioFundo.loop = true;
audioFundo.volume = 0.25;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    audioFundo.play().catch(() => {});
  }, 1000);
});

// Pausar e retomar automaticamente conforme foco do app
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audioFundo.pause();
  else audioFundo.play().catch(() => {});
});
