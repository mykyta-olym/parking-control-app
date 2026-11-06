import { create } from 'zustand';
import { Parking } from '@/lib/types';
import { validateParkingId } from '@/lib/security';
import { showError, showInfo, showSuccess } from '@/lib/toast';

interface FavoritesState {
  favorites: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  getFavoriteParkings: (parkings: Parking[]) => Parking[];
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  addFavorite: (id) => {
    // Security: Validate ID before adding
    if (!validateParkingId(id)) {
      console.warn('Invalid parking ID, cannot add to favorites:', id);
      showError('Neplatné parkovanie, nemožno pridať do obľúbených.');
      return;
    }
    
    set((state) => {
      // Prevent duplicates
      if (state.favorites.includes(id)) {
        showInfo('Už je v obľúbených.');
        return state;
      }
      return {
        favorites: [...state.favorites, id],
      };
    });
    showSuccess('Pridané do obľúbených.');
  },
  removeFavorite: (id) => {
    // Security: Validate ID before removing
    if (!validateParkingId(id)) {
      console.warn('Invalid parking ID, cannot remove from favorites:', id);
      showError('Neplatné parkovanie, nemožno odstrániť z obľúbených.');
      return;
    }
    
    set((state) => ({
      favorites: state.favorites.filter((favId) => favId !== id),
    }));
    showInfo('Odstránené z obľúbených.');
  },
  isFavorite: (id) => {
    if (!validateParkingId(id)) {
      return false;
    }
    return get().favorites.includes(id);
  },
  getFavoriteParkings: (parkings) => {
    const favoriteIds = get().favorites;
    // Security: Filter out invalid IDs
    const validFavoriteIds = favoriteIds.filter((id) => validateParkingId(id));
    return parkings.filter((p) => validFavoriteIds.includes(p.id));
  },
}));

