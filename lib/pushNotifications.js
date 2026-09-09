function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function activerNotifications(supabase) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error("Les notifications ne sont pas prises en charge sur cet appareil ou ce navigateur.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Autorisation refusée pour les notifications.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });
  }

  const { data: { session } } = await supabase.auth.getSession();

  const reponse = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!reponse.ok) {
    throw new Error("Erreur lors de l'enregistrement de l'abonnement.");
  }
}
