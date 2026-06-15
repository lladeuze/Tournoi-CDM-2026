self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Rappel pronostic', {
      body: data.body || 'Tu as un prono à compléter.',
      icon: '/apple-icon.png',
      badge: '/apple-icon.png',
      data: {
        url: data.url || '/predictions',
      },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/predictions')
  );
});
