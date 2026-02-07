import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const FOOD_TYPES = [
  'Món Việt', 'Hải sản', 'Ăn vặt', 'Nướng', 'Lẩu', 'Chay',
  'Âu', 'Nhật', 'Hàn', 'Trung', 'Thái',
];

interface NewPlaceFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData: any;
}

export function NewPlaceFormModal({
  visible,
  onClose,
  onSubmit,
  initialData,
}: NewPlaceFormModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('08:00 - 22:00');
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(1);
  const [landmarkNotes, setLandmarkNotes] = useState('');

  // lat/lng may come from search result (OSM or DB)
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Sync initial data when opening
  useEffect(() => {
    if (visible && initialData) {
      setName(initialData.name || '');
      setAddress(initialData.address || '');
      setLat(initialData.lat ?? null);
      setLng(initialData.lng ?? null);
    }
  }, [visible, initialData]);

  const toggleFood = (type: string) => {
    setFoodTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và địa chỉ quán.');
      return;
    }

    onSubmit({
      isNew: true,
      name: name.trim(),
      address: address.trim(),
      openingHours: openingHours.trim(),
      cuisine: foodTypes,
      price_range: priceRange,
      landmark_notes: landmarkNotes.trim(),
      lat,
      lng,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Thêm quán mới</Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
              <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* BASIC INFO */}
            <Text style={styles.sectionLabel}>Thông tin cơ bản</Text>

            <TextInput
              placeholder="Tên quán *"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <View style={styles.rowInput}>
              <Ionicons name="time-outline" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Giờ mở cửa (VD: 08:00 - 22:00)"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={openingHours}
                onChangeText={setOpeningHours}
              />
            </View>

            {/* ADDRESS (MANUAL, NO GOOGLE) */}
            <Text style={styles.sectionLabel}>Địa chỉ *</Text>
            <TextInput
              placeholder="Nhập địa chỉ quán"
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />

            {/* CUISINE */}
            <Text style={styles.sectionLabel}>Loại món</Text>
            <View style={styles.tagContainer}>
              {FOOD_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tag, foodTypes.includes(t) && styles.tagActive]}
                  onPress={() => toggleFood(t)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      foodTypes.includes(t) && styles.tagTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PRICE */}
            <Text style={styles.sectionLabel}>Mức giá</Text>
            <View style={styles.priceContainer}>
              {[1, 2, 3, 4].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priceBtn, priceRange === p && styles.priceBtnActive]}
                  onPress={() => setPriceRange(p)}
                >
                  <Text
                    style={[
                      styles.priceBtnText,
                      priceRange === p && styles.priceBtnTextActive,
                    ]}
                  >
                    {'₫'.repeat(p)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LANDMARK */}
            <Text style={styles.sectionLabel}>Ghi chú chỉ dẫn</Text>
            <TextInput
              placeholder="Hẻm, cổng, hoặc điểm nhận diện..."
              style={[styles.input, styles.textArea]}
              multiline
              value={landmarkNotes}
              onChangeText={setLandmarkNotes}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  headerBtn: { padding: 4 },
  title: { fontWeight: '700', fontSize: 17 },
  saveText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  body: { padding: 16 },
  sectionLabel: { fontWeight: '600', marginBottom: 12, marginTop: 18 },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  tagActive: { backgroundColor: '#FFF4ED', borderColor: '#FFD8BF' },
  tagText: { color: '#666', fontSize: 13 },
  tagTextActive: { color: '#E65100', fontWeight: '600' },
  priceContainer: { flexDirection: 'row', gap: 10 },
  priceBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  priceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  priceBtnText: { color: '#666', fontWeight: 'bold' },
  priceBtnTextActive: { color: '#FFF' },
  textArea: { height: 100, textAlignVertical: 'top' },
});
