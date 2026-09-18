export function lireVocal(texte) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const enonce = new SpeechSynthesisUtterance(texte);
  enonce.lang = 'fr-FR';
  enonce.rate = 0.95;
  window.speechSynthesis.cancel(); // évite d'empiler plusieurs annonces
  window.speechSynthesis.speak(enonce);
}
