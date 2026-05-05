import { auth } from '../../../js/shared/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getUserProfile, isAdminProfile } from '../../../js/shared/user-profile.js';

const LOGIN_HREF = 'login.html';
const PUBLIC_PROFILE_HREF = '../../pages/profile/index.html';

export function bindAdminLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn || btn.dataset.logoutBound === '1') return;
  btn.dataset.logoutBound = '1';
  btn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = LOGIN_HREF;
  });
}

/**
 * Redirects guests and non-admins. Runs init only for admins.
 * @param {(user: import('firebase/auth').User) => void | Promise<void>} init
 */
export function gateAdmin(init) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = LOGIN_HREF;
      return;
    }
    try {
      const profile = await getUserProfile(user.uid);
      if (!isAdminProfile(profile)) {
        window.location.href = PUBLIC_PROFILE_HREF;
        return;
      }
    } catch (e) {
      console.error(e);
      window.location.href = PUBLIC_PROFILE_HREF;
      return;
    }
    await init(user);
  });
}
