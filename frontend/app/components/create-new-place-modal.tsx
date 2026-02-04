import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { COLORS } from '../../constants/theme';

const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_KEY';

const FOOD_TYPES = [
  'Món Việt','Hải sản','Ăn vặt','Nướng','Lẩu','Chay',
  'Âu','Nhật','Hàn','Trung','Thái',
];

export function NewPlaceFormModal({ visible, onClose, onSubmit, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [googleMeta, setGoogleMeta] = useState<any>(initialData || null);
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [landmarkNotes, setLandmarkNotes] = useState('');

  const toggleFood = (type: string) => {
    setFoodTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const submit = () => {
    onSubmit({
      isNew: true,
      name,
      address,
      ...googleMeta,
      foodTypes,
      priceRange,
      openingHours:
        openTime && closeTime ? { open: openTime, close: closeTime } : null,
      landmarkNotes,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Thêm quán mới</Text>
          <TouchableOpacity onPress={submit}>
            <Text style={styles.save}>Lưu</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <TextInput
            placeholder="Tên quán *"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <GooglePlacesAutocomplete
            placeholder="Địa chỉ *"
            fetchDetails
            query={{ key: GOOGLE_MAPS_API_KEY, language: 'vi' }}
            onPress={(data, details) => {
              setAddress(details.formatted_address);
              setGoogleMeta({
                google_place_id: data.place_id,
                google_maps_url: details.url,
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng,
              });
            }}
            styles={{ textInput: styles.input }}
          />

          <Text style={styles.label}>Loại món</Text>
          <View style={styles.chips}>
            {FOOD_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.chip,
                  foodTypes.includes(t) && styles.chipActive,
                ]}
                onPress={() => toggleFood(t)}
              >
                <Text>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Mức giá</Text>
          <View style={styles.row}>
            {[1,2,3,4].map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priceBtn,
                  priceRange === p && styles.priceActive,
                ]}
                onPress={() => setPriceRange(p)}
              >
                <Text>{'₫'.repeat(p)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Gợi ý tìm quán"
            style={[styles.input, { height: 80 }]}
            multiline
            value={landmarkNotes}
            onChangeText={setLandmarkNotes}
          />
        </ScrollView>
      </View>
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
  },
  title: { fontWeight: '700', fontSize: 16 },
  save: { color: COLORS.primary, fontWeight: '700' },
  body: { padding: 16 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  label: { fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EEE',
  },
  chipActive: { backgroundColor: '#FFD8BF' },
  row: { flexDirection: 'row', gap: 10 },
  priceBtn: { padding: 10, borderRadius: 8, backgroundColor: '#EEE' },
  priceActive: { backgroundColor: COLORS.primary },
});
