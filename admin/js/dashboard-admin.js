import { initNav } from '../../js/nav.js';
import { auth, db } from '../../js/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast } from '../../js/utils.js';

initNav('../');

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = 'login.html';
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

try {
  const [places, reviews, feedback] = await Promise.all([
    getDocs(collection(db, 'places')),
    getDocs(collection(db, 'placeReviews')),
    getDocs(collection(db, 'feedback'))
  ]);
  const reviewsData = reviews.docs.map(d => d.data());
  const pending = reviewsData.filter(r => r.status === 'pending').length;
  document.getElementById('kpi-places').textContent = String(places.size);
  document.getElementById('kpi-reviews').textContent = String(reviews.size);
  document.getElementById('kpi-pending').textContent = String(pending);
  document.getElementById('kpi-feedback').textContent = String(feedback.size);
} catch (err) {
  console.error(err);
  showToast('Не удалось загрузить KPI', 'error');
}
