export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Primera nota
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830, audioContext.currentTime);
    gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);

    // Segunda nota (más alta)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, audioContext.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.25, audioContext.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    osc2.start(audioContext.currentTime + 0.18);
    osc2.stop(audioContext.currentTime + 0.4);

    // Tercera nota (aún más alta - sonido de éxito)
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.connect(gain3);
    gain3.connect(audioContext.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1320, audioContext.currentTime + 0.42);
    gain3.gain.setValueAtTime(0.2, audioContext.currentTime + 0.42);
    gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
    osc3.start(audioContext.currentTime + 0.42);
    osc3.stop(audioContext.currentTime + 0.7);
  } catch (e) {
    console.log('Audio no disponible');
  }
}

export function playChatSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Sonido de "burbuja" o "pop" rápido para chat
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Un tono suave tipo marimba/pop
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    // Volumen rápido
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Audio no disponible para chat');
  }
}

export function playRegisterSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 1. Campana alta (ding de caja registradora)
    const oscBell = audioContext.createOscillator();
    const gainBell = audioContext.createGain();
    
    oscBell.connect(gainBell);
    gainBell.connect(audioContext.destination);
    
    oscBell.type = 'sine';
    oscBell.frequency.setValueAtTime(1760, audioContext.currentTime); // Nota La alta
    
    gainBell.gain.setValueAtTime(0, audioContext.currentTime);
    gainBell.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.01);
    gainBell.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscBell.start(audioContext.currentTime);
    oscBell.stop(audioContext.currentTime + 0.6);
    
    // 2. Jingle de monedas (chinchín rápido)
    const oscCoin = audioContext.createOscillator();
    const gainCoin = audioContext.createGain();
    
    oscCoin.connect(gainCoin);
    gainCoin.connect(audioContext.destination);
    
    oscCoin.type = 'triangle';
    oscCoin.frequency.setValueAtTime(2200, audioContext.currentTime + 0.04);
    
    gainCoin.gain.setValueAtTime(0, audioContext.currentTime + 0.04);
    gainCoin.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainCoin.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscCoin.start(audioContext.currentTime + 0.04);
    oscCoin.stop(audioContext.currentTime + 0.25);
  } catch (e) {
    console.log('Audio no disponible para caja');
  }
}
