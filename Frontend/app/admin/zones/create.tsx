import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { createZone, getDistricts, District } from '@/lib/adminApi';
import { ZoneCreateInput } from '@/lib/adminTypes';
import { showSuccess, showError } from '@/lib/toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Opening hours presets
const OPENING_HOURS_PRESETS = [
  { label: '24/7', value: '24/7' },
  { label: 'Po-Pi: 6:00-22:00', value: 'Po-Pi: 6:00-22:00' },
  { label: 'Po-Pi: 7:00-20:00', value: 'Po-Pi: 7:00-20:00' },
  { label: 'Po-Pi: 8:00-18:00', value: 'Po-Pi: 8:00-18:00' },
  { label: 'Po-Ne: 6:00-22:00', value: 'Po-Ne: 6:00-22:00' },
  { label: 'Po-Ne: 7:00-21:00', value: 'Po-Ne: 7:00-21:00' },
  { label: 'Po-Ne: 8:00-20:00', value: 'Po-Ne: 8:00-20:00' },
  { label: 'Po-So: 6:00-22:00', value: 'Po-So: 6:00-22:00' },
  { label: 'Po-So: 8:00-20:00', value: 'Po-So: 8:00-20:00' },
];

// Currency options
const CURRENCY_OPTIONS = [
  { value: '€', label: 'EUR (€)' },
  { value: '$', label: 'USD ($)' },
  { value: '£', label: 'GBP (£)' },
  { value: 'Kč', label: 'CZK (Kč)' },
  { value: 'zł', label: 'PLN (zł)' },
  { value: 'Ft', label: 'HUF (Ft)' },
];

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

// Create Zone Screen
export default function CreateZoneScreen() {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('€');
  const [tempMapCoords, setTempMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // BottomSheet for hours
  const hoursSheetRef = useRef<BottomSheet>(null);
  const hoursSnapPoints = useMemo(() => ['50%'], []);

  useEffect(() => {
    if (showHoursModal) {
      hoursSheetRef.current?.expand();
    } else {
      hoursSheetRef.current?.close();
    }
  }, [showHoursModal]);

  const handleHoursSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setShowHoursModal(false);
    }
  }, []);

  // Load districts from API
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const data = await getDistricts();
        setDistricts(data);
        // Set first district as default if available
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, district: data[0].id as any }));
        }
      } catch (error) {
        console.error('Failed to load districts:', error);
      } finally {
        setLoadingDistricts(false);
      }
    };
    loadDistricts();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'street' as const,
    district: '',
    address: '',
    description: '',
    lat: undefined as number | undefined,
    lon: undefined as number | undefined,
    priceLabel: '',
    pricePerHour: undefined as number | undefined,
    openingHours: '',
    isOpen: true,
    features: [] as string[],
    totalSpots: 0,
    occupiedSpots: 0,
  });

  const updateField = (
    field: keyof typeof formData,
    value: any
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

    if (!formData.id?.trim()) {
      newErrors.id = 'ID je povinné';
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'ID môže obsahovať len malé písmená, čísla a pomlčky';
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Názov je povinný';
    }

    if (!formData.district) {
      newErrors.district = 'Okres je povinný';
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
      await createZone(formData as ZoneCreateInput);
      showSuccess('Parkovisko bolo úspešne vytvorené', 'Úspech');
      setTimeout(() => router.back(), 500);
    } catch (error: any) {
      showError(error.message || 'Nepodarilo sa vytvoriť parkovisko', 'Chyba');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nové parkovisko</Text>
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
              label="ID parkoviska"
              value={formData.id}
              onChangeText={(v) => updateField('id', v.toLowerCase().replace(/\s/g, '-'))}
              placeholder="napr. zone-hlavna-ulica"
              error={errors.id}
              required
            />

            <FormInput
              label="Názov"
              value={formData.name}
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
            
            {/* Currency Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mena</Text>
              <View style={styles.currencyRow}>
                {CURRENCY_OPTIONS.map((currency) => (
                  <TouchableOpacity
                    key={currency.value}
                    style={[
                      styles.currencyButton,
                      selectedCurrency === currency.value && styles.currencyButtonActive,
                    ]}
                    onPress={() => setSelectedCurrency(currency.value)}
                  >
                    <Text
                      style={[
                        styles.currencyButtonText,
                        selectedCurrency === currency.value && styles.currencyButtonTextActive,
                      ]}
                    >
                      {currency.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cena za hodinu</Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={styles.priceInput}
                      value={formData.pricePerHour?.toString() || ''}
                      onChangeText={(v) =>
                        updateField('pricePerHour', parseFloat(v) || undefined)
                      }
                      keyboardType="decimal-pad"
                      placeholder="1.00"
                      placeholderTextColor={Colors.text.tertiary}
                    />
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{selectedCurrency}/hod</Text>
                    </View>
                  </View>
                  {errors.pricePerHour && <Text style={styles.errorText}>{errors.pricePerHour}</Text>}
                </View>
              </View>
              <View style={styles.halfInput}>
                <FormInput
                  label="Cenový štítok"
                  value={formData.priceLabel || ''}
                  onChangeText={(v) => updateField('priceLabel', v)}
                  placeholder={`1.00${selectedCurrency}/hod`}
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

            {/* Opening Hours Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Otváracie hodiny</Text>
              <TouchableOpacity
                style={styles.hoursPickerButton}
                onPress={() => setShowHoursModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.hoursPickerText,
                  !formData.openingHours && styles.hoursPickerPlaceholder
                ]}>
                  {formData.openingHours || 'Vyberte otváracie hodiny'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.saveSection}>
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
                    <Text style={styles.saveButtonText}>Vytvoriť parkovisko</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Opening Hours BottomSheet */}
      <BottomSheet
        ref={hoursSheetRef}
        index={showHoursModal ? 0 : -1}
        snapPoints={hoursSnapPoints}
        onChange={handleHoursSheetChanges}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Otváracie hodiny</Text>
        </View>
        <BottomSheetFlatList
          data={OPENING_HOURS_PRESETS}
          keyExtractor={(item: { label: string; value: string }) => item.value}
          renderItem={({ item }: { item: { label: string; value: string } }) => (
            <TouchableOpacity
              style={[
                styles.hoursOption,
                formData.openingHours === item.value && styles.hoursOptionSelected
              ]}
              onPress={() => {
                updateField('openingHours', item.value);
                hoursSheetRef.current?.close();
              }}
            >
              <Text style={[
                styles.hoursOptionText,
                formData.openingHours === item.value && styles.hoursOptionTextSelected
              ]}>
                {item.label}
              </Text>
              {formData.openingHours === item.value && (
                <Ionicons name="checkmark" size={20} color={Colors.gradient.start} />
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetListContent}
        />
      </BottomSheet>

      {/* Map Modal for GPS selection */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <SafeAreaView edges={['top']} style={styles.mapModalHeaderSafe}>
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
          </SafeAreaView>

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
        </View>
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
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyButtonActive: {
    backgroundColor: Colors.gradient.start,
    borderColor: Colors.gradient.start,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text.primary,
  },
  currencyBadge: {
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  hoursPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  hoursPickerText: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  hoursPickerPlaceholder: {
    color: Colors.text.tertiary,
  },
  // BottomSheet Styles
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: Colors.text.tertiary,
    width: 40,
    height: 4,
  },
  sheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sheetListContent: {
    paddingBottom: 34,
  },
  hoursOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  hoursOptionSelected: {
    backgroundColor: `${Colors.gradient.start}10`,
  },
  hoursOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  hoursOptionTextSelected: {
    color: Colors.gradient.start,
    fontWeight: '600',
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
  mapModalHeaderSafe: {
    backgroundColor: Colors.white,
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
