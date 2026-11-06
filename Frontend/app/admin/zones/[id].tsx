import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import {
  getZone,
  updateZone,
  getDistricts,
  District,
} from '@/lib/adminApi';
import { AdminZone, ZoneUpdateInput } from '@/lib/adminTypes';
import { showSuccess, showError } from '@/lib/toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Zone type options
const ZONE_TYPES = [
  { value: 'street', label: 'Ulica', icon: 'map-outline' },
  { value: 'garage', label: 'Garáž', icon: 'business-outline' },
  { value: 'lot', label: 'Parkovisko', icon: 'car-outline' },
  { value: 'private', label: 'Súkromné', icon: 'lock-closed-outline' },
];

// Common features
const COMMON_FEATURES = [
  { value: 'EV', label: 'EV nabíjanie', icon: 'flash-outline' },
  { value: '24/7', label: '24/7', icon: 'time-outline' },
  { value: 'ZTP', label: 'ZŤP parkovanie', icon: 'accessibility-outline' },
  { value: 'CAMERA', label: 'Kamerový systém', icon: 'videocam-outline' },
  { value: 'COVERED', label: 'Zastrešené', icon: 'umbrella-outline' },
  { value: 'SECURITY', label: 'Strážené', icon: 'shield-checkmark-outline' },
];

// Form Input Component
interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  error?: string;
  required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  error,
  required = false,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
    <TextInput
      style={[
        styles.textInput,
        multiline && styles.textInputMultiline,
        error && styles.textInputError,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.text.tertiary}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Selection Button Component
interface SelectButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: string;
}

const SelectButton: React.FC<SelectButtonProps> = ({
  label,
  selected,
  onPress,
  color,
  icon,
}) => (
  <TouchableOpacity
    style={[
      styles.selectButton,
      selected && styles.selectButtonActive,
      selected && color && { backgroundColor: color },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && (
      <Ionicons
        name={icon as any}
        size={18}
        color={selected ? '#fff' : Colors.text.secondary}
        style={{ marginRight: 6 }}
      />
    )}
    <Text
      style={[styles.selectButtonText, selected && styles.selectButtonTextActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Main Edit Zone Screen
export default function EditZoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempMapCoords, setTempMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Form state
  const [formData, setFormData] = useState<ZoneUpdateInput>({
    name: '',
    type: 'street',
    district: undefined,
    address: '',
    description: '',
    lat: undefined,
    lon: undefined,
    priceLabel: '',
    pricePerHour: undefined,
    openingHours: '',
    isOpen: true,
    features: [],
    totalSpots: 0,
    occupiedSpots: 0,
  });

  // Load districts from API
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const data = await getDistricts();
        setDistricts(data);
      } catch (error) {
        console.error('Failed to load districts:', error);
      } finally {
        setLoadingDistricts(false);
      }
    };
    loadDistricts();
  }, []);

  // Fetch existing zone data
  useEffect(() => {
    if (id) {
      fetchZone();
    }
  }, [id]);

  const fetchZone = async () => {
    try {
      const zone = await getZone(id!);
      setFormData({
        name: zone.name,
        type: zone.type as any,
        district: zone.district as any,
        address: zone.address || '',
        description: zone.description || '',
        lat: zone.lat,
        lon: zone.lon,
        priceLabel: zone.priceLabel || '',
        pricePerHour: zone.pricePerHour,
        openingHours: zone.openingHours || '',
        isOpen: zone.isOpen,
        features: zone.features,
        totalSpots: zone.totalSpots,
        occupiedSpots: zone.occupiedSpots,
      });
    } catch (error) {
      console.error('Failed to fetch zone:', error);
      showError('Nepodarilo sa načítať parkovisko', 'Chyba');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof ZoneUpdateInput>(
    field: K,
    value: ZoneUpdateInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleFeature = (feature: string) => {
    const features = formData.features || [];
    if (features.includes(feature)) {
      updateField('features', features.filter((f) => f !== feature));
    } else {
      updateField('features', [...features, feature]);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Názov je povinný';
    }

    if ((formData.totalSpots ?? 0) < 0) {
      newErrors.totalSpots = 'Počet miest musí byť kladný';
    }

    if ((formData.occupiedSpots ?? 0) < 0) {
      newErrors.occupiedSpots = 'Počet obsadených musí byť kladný';
    }

    if (
      formData.occupiedSpots !== undefined &&
      formData.totalSpots !== undefined &&
      formData.occupiedSpots > formData.totalSpots
    ) {
      newErrors.occupiedSpots = 'Obsadené miesta nesmú presiahnuť celkový počet';
    }

    if (formData.pricePerHour !== undefined && formData.pricePerHour < 0) {
      newErrors.pricePerHour = 'Cena musí byť kladná';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMapPress = async (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMapCoords({ lat: latitude, lon: longitude });
    
    // Reverse geocoding to get address
    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (result) {
        // Build street part: "Hlavná 15" or just "Hlavná"
        const streetPart = [result.street, result.streetNumber].filter(Boolean).join(' ');
        
        // Build full address with all available parts
        const addressParts = [
          streetPart,
          result.district || result.subregion,  // District/neighborhood
          result.city,
          result.postalCode,
        ].filter(Boolean);
        
        const address = addressParts.join(', ') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        updateField('address', address);
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
    }
  };

  const handleConfirmMapLocation = () => {
    if (tempMapCoords) {
      updateField('lat', tempMapCoords.lat);
      updateField('lon', tempMapCoords.lon);
    }
    setShowMapModal(false);
    setTempMapCoords(null);
  };

  const openMapModal = () => {
    // Initialize with current coords or default to Košice center
    if (formData.lat && formData.lon) {
      setTempMapCoords({ lat: formData.lat, lon: formData.lon });
    } else {
      setTempMapCoords({ lat: 48.7133, lon: 21.2439 });
    }
    setShowMapModal(true);
  };

  const handleSave = async () => {
    if (!validate()) {
      showError('Prosím opravte chyby vo formulári', 'Chyba');
      return;
    }

    setSaving(true);
    try {
      await updateZone(id!, formData);
      showSuccess('Parkovisko bolo úspešne aktualizované', 'Úspech');
      setTimeout(() => router.back(), 500);
    } catch (error: any) {
      showError(error.message || 'Nepodarilo sa uložiť parkovisko', 'Chyba');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upraviť parkovisko</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gradient.start} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upraviť parkovisko</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Základné informácie</Text>

            <FormInput
              label="Názov"
              value={formData.name || ''}
              onChangeText={(v) => updateField('name', v)}
              placeholder="Názov parkoviska"
              error={errors.name}
              required
            />

            <FormInput
              label="Adresa"
              value={formData.address || ''}
              onChangeText={(v) => updateField('address', v)}
              placeholder="Ulica a číslo"
            />

            <FormInput
              label="Popis"
              value={formData.description || ''}
              onChangeText={(v) => updateField('description', v)}
              placeholder="Krátky popis parkoviska..."
              multiline
            />
          </View>

          {/* Type Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Typ parkoviska</Text>
            <View style={styles.buttonGrid}>
              {ZONE_TYPES.map((type) => (
                <SelectButton
                  key={type.value}
                  label={type.label}
                  icon={type.icon}
                  selected={formData.type === type.value}
                  onPress={() => updateField('type', type.value as any)}
                />
              ))}
            </View>
          </View>

          {/* District Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Okres</Text>
            {loadingDistricts ? (
              <ActivityIndicator size="small" color={Colors.gradient.start} />
            ) : districts.length === 0 ? (
              <Text style={styles.noDistrictsText}>
                Žiadne okresy. Najprv vytvorte okres v sekcii Okresy.
              </Text>
            ) : (
              <View style={styles.buttonGrid}>
                {districts.map((district) => (
                  <SelectButton
                    key={district.id}
                    label={district.label}
                    selected={formData.district === district.id}
                    onPress={() => updateField('district', district.id as any)}
                    color={district.color}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Capacity Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kapacita</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <FormInput
                  label="Celkom miest"
                  value={String(formData.totalSpots || '')}
                  onChangeText={(v) =>
                    updateField('totalSpots', parseInt(v) || 0)
                  }
                  keyboardType="numeric"
                  error={errors.totalSpots}
                />
              </View>
              <View style={styles.halfInput}>
                <FormInput
                  label="Obsadených"
                  value={String(formData.occupiedSpots || '')}
                  onChangeText={(v) =>
                    updateField('occupiedSpots', parseInt(v) || 0)
                  }
                  keyboardType="numeric"
                  error={errors.occupiedSpots}
                />
              </View>
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cena</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <FormInput
                  label="Cena za hodinu"
                  value={formData.pricePerHour?.toString() || ''}
                  onChangeText={(v) =>
                    updateField('pricePerHour', parseFloat(v) || undefined)
                  }
                  keyboardType="decimal-pad"
                  placeholder="1.00"
                  error={errors.pricePerHour}
                />
              </View>
              <View style={styles.halfInput}>
                <FormInput
                  label="Cenový štítok"
                  value={formData.priceLabel || ''}
                  onChangeText={(v) => updateField('priceLabel', v)}
                  placeholder="1.00€/hod"
                />
              </View>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Poloha (GPS)</Text>
            
            {/* Map Picker Button */}
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={openMapModal}
              activeOpacity={0.7}
            >
              <View style={styles.mapPickerContent}>
                <Ionicons name="map" size={24} color={Colors.gradient.start} />
                <View style={styles.mapPickerTextContainer}>
                  <Text style={styles.mapPickerTitle}>Vybrať na mape</Text>
                  <Text style={styles.mapPickerSubtitle}>
                    {formData.lat && formData.lon 
                      ? `${formData.lat.toFixed(6)}, ${formData.lon.toFixed(6)}`
                      : 'Kliknite pre výber polohy'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>

            <Text style={styles.orDividerText}>alebo zadajte manuálne</Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <FormInput
                  label="Zemepisná šírka"
                  value={formData.lat?.toString() || ''}
                  onChangeText={(v) =>
                    updateField('lat', parseFloat(v) || undefined)
                  }
                  keyboardType="decimal-pad"
                  placeholder="48.7133"
                />
              </View>
              <View style={styles.halfInput}>
                <FormInput
                  label="Zemepisná dĺžka"
                  value={formData.lon?.toString() || ''}
                  onChangeText={(v) =>
                    updateField('lon', parseFloat(v) || undefined)
                  }
                  keyboardType="decimal-pad"
                  placeholder="21.2439"
                />
              </View>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vybavenie</Text>
            <View style={styles.buttonGrid}>
              {COMMON_FEATURES.map((feature) => (
                <SelectButton
                  key={feature.value}
                  label={feature.label}
                  icon={feature.icon}
                  selected={(formData.features || []).includes(feature.value)}
                  onPress={() => toggleFeature(feature.value)}
                />
              ))}
            </View>
          </View>

          {/* Status Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stav</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Otvorené</Text>
                <Text style={styles.switchDescription}>
                  Parkovisko je v prevádzke a prijíma vozidlá
                </Text>
              </View>
              <Switch
                value={formData.isOpen}
                onValueChange={(v) => updateField('isOpen', v)}
                trackColor={{ false: '#e0e0e0', true: '#81c784' }}
                thumbColor={formData.isOpen ? '#2ecc71' : '#f4f3f4'}
              />
            </View>

            <FormInput
              label="Otváracie hodiny"
              value={formData.openingHours || ''}
              onChangeText={(v) => updateField('openingHours', v)}
              placeholder="napr. Po-Pi: 6:00-22:00, So-Ne: 8:00-20:00"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.saveSection}>
            {/* Analytics Button */}
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={() => router.push(`/admin/zones/${id}/analytics` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="analytics-outline" size={20} color={Colors.gradient.start} />
              <Text style={styles.analyticsButtonText}>Zobraziť analytiku parkoviska</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.gradient.start, Colors.gradient.end]}
                style={styles.saveGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={22} color="#fff" />
                    <Text style={styles.saveButtonText}>Uložiť zmeny</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Modal for GPS selection */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              style={styles.mapModalCloseBtn}
              onPress={() => {
                setShowMapModal(false);
                setTempMapCoords(null);
              }}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Vyberte polohu</Text>
            <TouchableOpacity
              style={styles.mapModalConfirmBtn}
              onPress={handleConfirmMapLocation}
              disabled={!tempMapCoords}
            >
              <Text style={[
                styles.mapModalConfirmText,
                !tempMapCoords && { opacity: 0.5 }
              ]}>
                Potvrdiť
              </Text>
            </TouchableOpacity>
          </View>

          <MapView
            ref={mapRef}
            style={styles.fullMap}
            initialRegion={{
              latitude: tempMapCoords?.lat || 48.7133,
              longitude: tempMapCoords?.lon || 21.2439,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {tempMapCoords && (
              <Marker
                coordinate={{
                  latitude: tempMapCoords.lat,
                  longitude: tempMapCoords.lon,
                }}
                pinColor={Colors.gradient.start}
              />
            )}
          </MapView>

          <View style={styles.mapModalFooter}>
            <Text style={styles.mapModalHint}>
              Kliknite na mapu pre výber polohy parkoviska
            </Text>
            {tempMapCoords && (
              <Text style={styles.mapModalCoords}>
                {tempMapCoords.lat.toFixed(6)}, {tempMapCoords.lon.toFixed(6)}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  requiredStar: {
    color: '#e74c3c',
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectButtonActive: {
    backgroundColor: Colors.gradient.start,
    borderColor: Colors.gradient.start,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  selectButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  saveSection: {
    marginTop: 8,
    gap: 12,
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.gradient.start,
    gap: 10,
  },
  analyticsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gradient.start,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacing: {
    height: 100,
  },
  noDistrictsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Map Picker Styles
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  mapPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapPickerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  mapPickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  mapPickerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  orDividerText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  mapModalCloseBtn: {
    padding: 8,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mapModalConfirmBtn: {
    padding: 8,
  },
  mapModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gradient.start,
  },
  fullMap: {
    flex: 1,
  },
  mapModalFooter: {
    backgroundColor: Colors.white,
    padding: 16,
    alignItems: 'center',
  },
  mapModalHint: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  mapModalCoords: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gradient.start,
    marginTop: 8,
  },
});
