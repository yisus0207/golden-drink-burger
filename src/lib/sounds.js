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
