self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'RNCR', body: 'Nouvelle alerte' };
  }

  const options = {
    body: data.body || '',
    icon: '/icone.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'RNCR', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
