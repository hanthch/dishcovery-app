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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/Api.service';
import { COLORS } from '../../constants/theme';

const FOOD_TYPES = [
  'Món Việt', 'Hải sản', 'Ăn vặt', 'Nướng', 'Lẩu', 'Chay',
  'Món Âu-Mỹ', 'Món Nhật', 'Món Hàn', 'Món Trung', 'Món Thái', 'Món Ấn',
];

interface NewPlaceFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when user completes the form — backend will INSERT this restaurant */
  onSubmit: (data: any) => void;
  /** Called when user taps a duplicate suggestion — treat as existing restaurant */
  onPickExisting: (item: any) => void;
  initialData: any;
}

export function NewPlaceFormModal({
  visible,
  onClose,
  onSubmit,
  onPickExisting,
  initialData,
}: NewPlaceFormModalProps) {
  const [name, setName]               = useState('');
  const [address, setAddress]         = useState('');
  const [openingHours, setOpeningHours] = useState('08:00 - 22:00');
  const [foodTypes, setFoodTypes]     = useState<string[]>([]);
  const [priceRange, setPriceRange]   = useState<number>(1);
  const [landmarkNotes, setLandmarkNotes] = useState('');
  const [lat, setLat]                 = useState<number | null>(null);
  const [lng, setLng]                 = useState<number | null>(null);

  // Duplicate-check state
  const [dupSuggestions, setDupSuggestions]   = useState<any[]>([]);
  const [dupDismissed, setDupDismissed]       = useState(false);
  const [checkingDup, setCheckingDup]         = useState(false);

  // Sync initial data when opening
  useEffect(() => {
    if (visible && initialData) {
      setName(initialData.name || '');
      setAddress(initialData.address || '');
      setLat(initialData.lat ?? null);
      setLng(initialData.lng ?? null);
      // Reset dup state on each open
      setDupSuggestions([]);
      setDupDismissed(false);
    }
  }, [visible, initialData]);

  const toggleFood = (type: string) => {
    setFoodTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // ── Duplicate check on name blur ─────────────────────────────────────────
  // Calls GET /places/check-duplicate — non-blocking, non-fatal.
  const handleNameBlur = async () => {
    if (!name.trim() || name.trim().length < 3) return;
    setCheckingDup(true);
    setDupDismissed(false);
    try {
      const result = await apiService.checkPlaceDuplicate(
        name.trim(),
        address.trim() || undefined
      );
      setDupSuggestions(result.hasDuplicates ? result.suggestions : []);
    } catch (err) {
      // Non-fatal — if check fails, user can still proceed
      console.warn('[NewPlaceForm] checkPlaceDuplicate failed:', err);
      setDupSuggestions([]);
    } finally {
      setCheckingDup(false);
    }
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

  // ── Duplicate warning banner ──────────────────────────────────────────────
  const showDupBanner = dupSuggestions.length > 0 && !dupDismissed;

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
            {/* Community contribution callout */}
            <View style={styles.callout}>
              <Text style={styles.calloutIcon}>🌟</Text>
              <Text style={styles.calloutText}>
                Quán này sẽ được thêm vào Dishcovery và hiển thị cho cộng đồng sau khi xác minh.
              </Text>
            </View>

            {/* ── Duplicate warning banner ─────────────────────────────── */}
            {showDupBanner && (
              <View style={styles.dupBanner}>
                <View style={styles.dupHeader}>
                  <View style={styles.dupTitleRow}>
                    <Ionicons name="warning-outline" size={18} color="#B85C00" />
                    <Text style={styles.dupTitle}>Quán này có thể đã tồn tại</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDupDismissed(true)}>
                    <Text style={styles.dupDismiss}>Bỏ qua →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dupSubtitle}>
                  Chọn một gợi ý để gắn tag quán hiện có, hoặc bỏ qua nếu đây là quán khác.
                </Text>

                {dupSuggestions.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.dupRow}
                    onPress={() => { onPickExisting(s); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dupThumb}>
                      <Ionicons
                        name="restaurant"
                        size={16}
                        color={s.verified ? COLORS.primary : '#888'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.dupNameRow}>
                        <Text style={styles.dupName}>{s.name}</Text>
                        {s.verified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dupAddr} numberOfLines={1}>{s.address}</Text>
                      {s.rating && (
                        <Text style={styles.dupRating}>⭐ {s.rating.toFixed(1)}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── BASIC INFO ──────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Thông tin cơ bản</Text>

            <View>
              <TextInput
                placeholder="Tên quán *"
                style={styles.input}
                value={name}
                onChangeText={t => {
                  setName(t);
                  // Clear suggestions when user starts editing again
                  if (dupSuggestions.length) setDupSuggestions([]);
                }}
                onBlur={handleNameBlur}
                returnKeyType="next"
              />
              {checkingDup && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={styles.dupLoader}
                />
              )}
            </View>

            <View style={styles.rowInput}>
              <Ionicons name="time-outline" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Giờ mở cửa (VD: 08:00 - 22:00)"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={openingHours}
                onChangeText={setOpeningHours}
              />
            </View>

            {/* ── ADDRESS ─────────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Địa chỉ *</Text>
            <TextInput
              placeholder="Nhập địa chỉ quán"
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />

            {/* ── CUISINE ─────────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Loại món</Text>
            <View style={styles.tagContainer}>
              {FOOD_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tag, foodTypes.includes(t) && styles.tagActive]}
                  onPress={() => toggleFood(t)}
                >
                  <Text style={[styles.tagText, foodTypes.includes(t) && styles.tagTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── PRICE ───────────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Mức giá</Text>
            <View style={styles.priceContainer}>
              {[1, 2, 3, 4].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priceBtn, priceRange === p && styles.priceBtnActive]}
                  onPress={() => setPriceRange(p)}
                >
                  <Text style={[styles.priceBtnText, priceRange === p && styles.priceBtnTextActive]}>
                    {'₫'.repeat(p)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── LANDMARK ────────────────────────────────────────────────── */}
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
  title:    { fontWeight: '700', fontSize: 17 },
  saveText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  body:     { padding: 16 },

  // ── Community callout ─────────────────────────────────────────────────────
  callout: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F3',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: 'flex-start',
  },
  calloutIcon: { fontSize: 18, marginTop: 1 },
  calloutText: { flex: 1, fontSize: 13, color: '#5A3000', lineHeight: 19 },

  // ── Duplicate banner ──────────────────────────────────────────────────────
  dupBanner: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    padding: 14,
    marginBottom: 18,
  },
  dupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dupTitle:    { fontSize: 14, fontWeight: '700', color: '#7A4800' },
  dupDismiss:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  dupSubtitle: { fontSize: 12, color: '#7A4800', marginBottom: 10, lineHeight: 17 },
  dupLoader:   { marginTop: -6, marginBottom: 8, alignSelf: 'flex-start' },

  dupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EEE',
    gap: 10,
  },
  dupThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFF3EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dupNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dupName:       { fontSize: 13, fontWeight: '700', color: '#222' },
  verifiedBadge: { backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedText:  { fontSize: 9, color: '#fff', fontWeight: '700' },
  dupAddr:       { fontSize: 11, color: '#888' },
  dupRating:     { fontSize: 11, color: '#FF8C42', marginTop: 2 },

  // ── Form fields ───────────────────────────────────────────────────────────
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
  tagActive:     { backgroundColor: '#FFF4ED', borderColor: '#FFD8BF' },
  tagText:       { color: '#666', fontSize: 13 },
  tagTextActive: { color: '#E65100', fontWeight: '600' },
  priceContainer:      { flexDirection: 'row', gap: 10 },
  priceBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  priceBtnActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  priceBtnText:       { color: '#666', fontWeight: 'bold' },
  priceBtnTextActive: { color: '#FFF' },
  textArea: { height: 100, textAlignVertical: 'top' },
});