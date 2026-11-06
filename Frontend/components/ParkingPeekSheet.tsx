import React, { forwardRef, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetView, useBottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Parking } from '@/lib/types';
import { useModalStore } from '@/store/modalStore';

export interface ParkingPeekSheetProps {
  parking: Parking | null;
  onViewDetails: (parking: Parking) => void;
}

const ParkingPeekSheet = forwardRef<BottomSheetModal, ParkingPeekSheetProps>(
  ({ parking, onViewDetails }, ref) => {
    const { openModal, closeModal, canOpenModal } = useModalStore();
    const insets = useSafeAreaInsets();
    // Use static percentage snap point to avoid CONTENT_HEIGHT invariant in v5
    const snapPoints = useMemo(() => ['35%'], []);
    const { dismiss } = useBottomSheetModal();

    // Handle modal state management
    useEffect(() => {
      if (parking) {
        // Check if we can open this modal (filterSheet should block it)
        if (!canOpenModal('peekSheet')) {
          // Filter sheet is open, prevent opening
          if (ref && 'current' in ref && ref.current) {
            ref.current.dismiss();
          }
          return;
        }
        // Try to open modal, if successful, present the sheet
        if (openModal('peekSheet')) {
          // Modal opened successfully, BottomSheetModal will handle presentation
        } else {
          // Couldn't open modal, dismiss sheet
          if (ref && 'current' in ref && ref.current) {
            ref.current.dismiss();
          }
        }
      } else {
        closeModal('peekSheet');
      }
      
      return () => {
        closeModal('peekSheet');
      };
    }, [parking, canOpenModal, openModal, closeModal, ref]);

    const handleDismiss = useCallback(() => {
      closeModal('peekSheet');
    }, [closeModal]);

    if (!parking) return null;

    const occupancy = parking.totalSpots > 0
      ? Math.round(((parking.totalSpots - parking.freeSpots) / parking.totalSpots) * 100)
      : 0;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        handleStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
        onDismiss={handleDismiss}
        android_keyboardInputMode="adjustResize"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        enableDynamicSizing={false}
        enableContentPanningGesture={true}
        enableHandlePanningGesture={true}
        bottomInset={insets.bottom}
        detached={false}>
        <BottomSheetView style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{parking.name}</Text>
            <View style={[styles.badge, parking.isOpen ? styles.badgeOpen : styles.badgeClosed]}>
              <Text style={[styles.badgeText, parking.isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                {parking.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          <Text style={styles.address} numberOfLines={1}>
            {parking.address}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{parking.freeSpots}/{parking.totalSpots}</Text>
              <Text style={styles.statLabel}>Free / Total</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{occupancy}%</Text>
              <Text style={styles.statLabel}>Occupancy</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{parking.price}</Text>
              <Text style={styles.statLabel}>Pricing</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => dismiss()}>
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Close</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => onViewDetails(parking)}>
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>View details</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

ParkingPeekSheet.displayName = 'ParkingPeekSheet';

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOpen: {
    backgroundColor: '#E6F6EC',
  },
  badgeClosed: {
    backgroundColor: '#FDECEC',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextOpen: {
    color: '#167C3B',
  },
  badgeTextClosed: {
    color: '#A31212',
  },
  address: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    marginVertical: 4,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.gradient.start,
    shadowColor: Colors.gradient.start,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: Colors.white,
  },
  buttonTextSecondary: {
    color: Colors.text.primary,
  },
});

export default ParkingPeekSheet;


