import { View, Text, StyleSheet } from 'react-native';
import { Marker, MapMarkerProps } from 'react-native-maps';
import { Colors } from '@/constants/colors';
import { Parking } from '@/lib/types';
import { useMemo } from 'react';

interface CustomMarkerProps extends Omit<MapMarkerProps, 'coordinate' | 'pinColor'> {
  parking: Parking;
  onPress?: () => void;
}

const getMarkerColor = (parking: Parking) => {
  const percentage = (parking.freeSpots / parking.totalSpots) * 100;
  if (percentage > 50) return Colors.status.green;
  if (percentage >= 20) return Colors.status.orange;
  return Colors.status.red;
};

export default function CustomMarker({ parking, onPress, ...props }: CustomMarkerProps) {
  const markerColor = useMemo(() => getMarkerColor(parking), [parking]);
  const fillPercentage = useMemo(() => Math.round((parking.freeSpots / parking.totalSpots) * 100), [parking]);

  if (!parking.coordinates || !parking.coordinates.latitude || !parking.coordinates.longitude) {
    return null;
  }

  return (
    <Marker
      {...props}
      coordinate={parking.coordinates}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={true}>
      <View style={styles.markerContainer} collapsable={false}>
        <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
          <Text style={styles.markerP}>P</Text>
        </View>
        <View style={[styles.markerInfo, { borderColor: markerColor }]} collapsable={false}>
          <Text style={styles.markerName} numberOfLines={1}>
            {parking.name}
          </Text>
          <Text style={styles.markerAddress} numberOfLines={1}>
            {parking.address}
          </Text>
          <View style={styles.markerStats}>
            <Text style={styles.markerStatsText}>
              {parking.freeSpots}/{parking.totalSpots} voľných
            </Text>
            <View style={[styles.markerBadge, { backgroundColor: markerColor }]}>
              <Text style={styles.markerBadgeText}>{fillPercentage}%</Text>
            </View>
          </View>
          <Text style={styles.markerPrice}>{parking.price}</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.status.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  markerP: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  markerInfo: {
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 140,
    maxWidth: 180,
    borderWidth: 2,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  markerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  markerAddress: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  markerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  markerStatsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  markerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.status.green,
  },
  markerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  markerPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gradient.start,
    textAlign: 'right',
  },
});

