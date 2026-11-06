import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { createDistrict } from '@/lib/adminApi';
import { showSuccess, showError } from '@/lib/toast';

// Predefined colors for district selection
const DISTRICT_COLORS = [
  { value: '#3498db', label: 'Modrá' },
  { value: '#e74c3c', label: 'Červená' },
  { value: '#2ecc71', label: 'Zelená' },
  { value: '#f1c40f', label: 'Žltá' },
  { value: '#9b59b6', label: 'Fialová' },
  { value: '#e67e22', label: 'Oranžová' },
  { value: '#1abc9c', label: 'Tyrkysová' },
  { value: '#34495e', label: 'Tmavá' },
];

// Form Input Component
interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label}
      {required && <Text style={styles.requiredStar}> *</Text>}
    </Text>
    <TextInput
      style={[styles.textInput, error && styles.textInputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.text.tertiary}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Color Picker Component
interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selected, onSelect }) => (
  <View style={styles.colorGrid}>
    {DISTRICT_COLORS.map((color) => (
      <TouchableOpacity
        key={color.value}
        style={[
          styles.colorButton,
          { backgroundColor: color.value },
          selected === color.value && styles.colorButtonSelected,
        ]}
        onPress={() => onSelect(color.value)}
        activeOpacity={0.7}
      >
        {selected === color.value && (
          <Ionicons name="checkmark" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// Create District Screen
export default function CreateDistrictScreen() {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    label: '',
    color: '#3498db',
    description: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'ID je povinné';
    } else if (!/^[A-Z0-9_ ]+$/.test(formData.id)) {
      newErrors.id = 'ID môže obsahovať len veľké písmená, čísla a podčiarkovníky';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Názov je povinný';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Štítok je povinný';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      showError('Prosím opravte chyby vo formulári', 'Chyba');
      return;
    }

    setSaving(true);
    try {
      await createDistrict({
        id: formData.id.toUpperCase().replace(/\s+/g, ' ').trim(),
        name: formData.name,
        label: formData.label,
        color: formData.color,
        description: formData.description,
      });
      showSuccess('Okres bol úspešne vytvorený', 'Úspech');
      setTimeout(() => router.back(), 500);
    } catch (error: any) {
      showError(error.message || 'Nepodarilo sa vytvoriť okres', 'Chyba');
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
        <Text style={styles.headerTitle}>Nový okres</Text>
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
              label="ID okresu"
              value={formData.id}
              onChangeText={(v) => updateField('id', v.toUpperCase())}
              placeholder="napr. VYCHOD"
              error={errors.id}
              required
            />

            <FormInput
              label="Názov"
              value={formData.name}
              onChangeText={(v) => updateField('name', v)}
              placeholder="Názov okresu"
              error={errors.name}
              required
            />

            <FormInput
              label="Štítok (zobrazený názov)"
              value={formData.label}
              onChangeText={(v) => updateField('label', v)}
              placeholder="napr. Východ"
              error={errors.label}
              required
            />

            <FormInput
              label="Popis"
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              placeholder="Krátky popis okresu (voliteľné)"
            />
          </View>

          {/* Color Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farba okresu</Text>
            <Text style={styles.colorDescription}>
              Vyberte farbu pre označenie okresu na mape a v grafoch
            </Text>
            <ColorPicker
              selected={formData.color}
              onSelect={(color) => updateField('color', color)}
            />
            
            {/* Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Náhľad:</Text>
              <View style={[styles.previewBadge, { backgroundColor: formData.color }]}>
                <Text style={styles.previewBadgeText}>
                  {formData.label || 'Nový okres'}
                </Text>
              </View>
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
                    <Text style={styles.saveButtonText}>Vytvoriť okres</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  textInputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  colorDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginRight: 12,
  },
  previewBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});
