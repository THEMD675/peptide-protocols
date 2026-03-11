export type TourId = 'dashboard' | 'library';

const STORAGE_KEY = (id: TourId) => `pptides_tour_done_${id}`;
export const isTourDone = (id: TourId) => {
  try { return localStorage.getItem(STORAGE_KEY(id)) === '1'; }
  catch { return false; }
};
export const markTourDone = (id: TourId) => {
  try { localStorage.setItem(STORAGE_KEY(id), '1'); } catch { /* ok */ }
};
