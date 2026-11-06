import { create } from 'zustand';

export type ModalType = 'filterSheet' | 'peekSheet' | 'loading' | 'other';

// Modal priorities: higher number = higher priority (blocks lower priority modals)
const MODAL_PRIORITIES: Record<ModalType, number> = {
  loading: 100,      // Highest priority - blocks everything
  filterSheet: 50,   // Medium-high priority - blocks peekSheet
  peekSheet: 30,     // Medium priority
  other: 10,         // Low priority
};

interface ModalState {
  openModals: Set<ModalType>;
  openModal: (type: ModalType) => boolean;
  closeModal: (type: ModalType) => void;
  isModalOpen: (type: ModalType) => boolean;
  hasAnyModalOpen: () => boolean;
  canOpenModal: (type: ModalType) => boolean;
  getHighestPriorityModal: () => ModalType | null;
  closeAllModals: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  openModals: new Set<ModalType>(),

  openModal: (type: ModalType) => {
    const { openModals, canOpenModal } = get();
    
    if (!canOpenModal(type)) {
      return false;
    }

    const newSet = new Set(openModals);
    newSet.add(type);
    set({ openModals: newSet });
    return true;
  },

  closeModal: (type: ModalType) => {
    const { openModals } = get();
    const newSet = new Set(openModals);
    newSet.delete(type);
    set({ openModals: newSet });
  },

  isModalOpen: (type: ModalType) => {
    return get().openModals.has(type);
  },

  hasAnyModalOpen: () => {
    return get().openModals.size > 0;
  },

  canOpenModal: (type: ModalType) => {
    const { openModals, getHighestPriorityModal } = get();
    
    // If no modals are open, allow opening
    if (openModals.size === 0) {
      return true;
    }

    const requestedPriority = MODAL_PRIORITIES[type];
    const highestOpen = getHighestPriorityModal();
    
    if (!highestOpen) {
      return true;
    }

    const highestPriority = MODAL_PRIORITIES[highestOpen];

    // Can only open if requesting modal has higher or equal priority
    // Exception: same modal type can be reopened (for refresh)
    if (openModals.has(type)) {
      return true; // Allow reopening same modal
    }

    // Loading modal blocks everything
    if (highestOpen === 'loading') {
      return false;
    }

    // Explicit blocking rules (regardless of priority)
    // FilterSheet blocks peekSheet
    if (highestOpen === 'filterSheet' && type === 'peekSheet') {
      return false;
    }

    // PeekSheet blocks filterSheet (mutual exclusion)
    if (highestOpen === 'peekSheet' && type === 'filterSheet') {
      return false;
    }

    // Higher priority modals can open only if not blocked by explicit rules above
    if (requestedPriority > highestPriority) {
      // But check explicit blocking first
      if (openModals.has('peekSheet') && type === 'filterSheet') {
        return false;
      }
      if (openModals.has('filterSheet') && type === 'peekSheet') {
        return false;
      }
      return true;
    }

    // Lower priority modals can't open if higher priority is open
    if (requestedPriority < highestPriority) {
      return false;
    }

    // Same priority: allow (for now, can be customized)
    return true;
  },

  getHighestPriorityModal: () => {
    const { openModals } = get();
    if (openModals.size === 0) {
      return null;
    }

    let highest: ModalType | null = null;
    let highestPriority = -1;

    openModals.forEach((type) => {
      const priority = MODAL_PRIORITIES[type];
      if (priority > highestPriority) {
        highestPriority = priority;
        highest = type;
      }
    });

    return highest;
  },

  closeAllModals: () => {
    set({ openModals: new Set() });
  },
}));
