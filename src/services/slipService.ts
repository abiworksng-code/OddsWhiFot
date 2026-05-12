import { Market } from '../types';

export interface SlipItem {
  id: string;
  game: string;
  market: Market | string;
  odds: number;
  confidence: number;
}

const STORAGE_KEY = 'oddswhiz_slip_buffer';

export const getSlipItems = (): SlipItem[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addSlipItem = (item: SlipItem) => {
  const items = getSlipItems();
  // Avoid duplicates
  if (items.find(i => i.id === item.id)) return;
  const updated = [...items, item];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Dispatch event for components to listen
  window.dispatchEvent(new Event('slip-updated'));
};

export const removeSlipItem = (id: string) => {
  const items = getSlipItems();
  const updated = items.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('slip-updated'));
};

export const clearSlip = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('slip-updated'));
};
