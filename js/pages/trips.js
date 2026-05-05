const LS_KEY = 'traces_trip_v1';

function read() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { version: 1, items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { version: 1, items: [] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      version: 1,
      items: items
        .map((x) => ({
          id: String(x?.id || '').trim(),
          name: String(x?.name || '').trim(),
          addedAt: Number(x?.addedAt || Date.now())
        }))
        .filter((x) => x.id)
        .slice(0, 200)
    };
  } catch {
    return { version: 1, items: [] };
  }
}

function write(state) {
  const safe = {
    version: 1,
    items: Array.isArray(state?.items) ? state.items.slice(0, 200) : []
  };
  localStorage.setItem(LS_KEY, JSON.stringify(safe));
}

export function getTrip() {
  return read();
}

export function getTripCount() {
  return read().items.length;
}

export function isInTrip(placeId) {
  const id = String(placeId || '').trim();
  if (!id) return false;
  return read().items.some((x) => x.id === id);
}

export function addToTrip(place) {
  const id = String(place?.id || '').trim();
  if (!id) return;
  const name = String(place?.name || '').trim();
  const st = read();
  if (st.items.some((x) => x.id === id)) return;
  st.items.unshift({ id, name, addedAt: Date.now() });
  write(st);
}

export function removeFromTrip(placeId) {
  const id = String(placeId || '').trim();
  if (!id) return;
  const st = read();
  st.items = st.items.filter((x) => x.id !== id);
  write(st);
}

export function clearTrip() {
  write({ version: 1, items: [] });
}

export function setTripItems(items) {
  write({ version: 1, items: Array.isArray(items) ? items : [] });
}

export function moveTripItem(placeId, dir) {
  const id = String(placeId || '').trim();
  if (!id) return;
  const st = read();
  const idx = st.items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const nextIdx = idx + (dir === 'up' ? -1 : 1);
  if (nextIdx < 0 || nextIdx >= st.items.length) return;
  const tmp = st.items[nextIdx];
  st.items[nextIdx] = st.items[idx];
  st.items[idx] = tmp;
  write(st);
}

