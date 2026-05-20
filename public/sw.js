// Service Worker de limpieza: se auto-desregistra para eliminar versiones anteriores problemáticas
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('Service Worker anterior eliminado correctamente.');
    })
  );
});
