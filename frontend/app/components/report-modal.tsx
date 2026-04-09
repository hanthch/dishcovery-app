import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/Api.service';

const C = {
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  card:     '#F8F8F8',
  border:   '#EEEEEE',
  accent:   '#FF8C42',
  red:      '#EF4444',
  text:     '#1A1A1A',
  textSub:  '#666666',
  textMuted:'#AAAAAA',
  overlay:  'rgba(0,0,0,0.5)',
};

const POST_REASONS = [
  { key: 'spam',          label: 'Spam hoặc gây hiểu lầm',     icon: 'ban-outline' },
  { key: 'inappropriate', label: 'Nội dung không phù hợp',      icon: 'alert-circle-outline' },
  { key: 'fake',          label: 'Thông tin giả mạo',           icon: 'help-circle-outline' },
  { key: 'violence',      label: 'Bạo lực hoặc nội dung hại',   icon: 'warning-outline' },
  { key: 'copyright',     label: 'Vi phạm bản quyền',           icon: 'copy-outline' },
  { key: 'other',         label: 'Lý do khác',                   icon: 'chatbubble-outline' },
] as const;

const USER_REASONS = [
  { key: 'harassment',    label: 'Quấy rối hoặc bắt nạt',      icon: 'sad-outline' },
  { key: 'spam',          label: 'Tài khoản spam',              icon: 'ban-outline' },
  { key: 'fake',          label: 'Tài khoản giả mạo',           icon: 'person-remove-outline' },
  { key: 'inappropriate', label: 'Nội dung không phù hợp',      icon: 'alert-circle-outline' },
  { key: 'other',         label: 'Lý do khác',                   icon: 'chatbubble-outline' },
] as const;

interface ReportModalProps {
  visible:        boolean;
  onClose:        () => void;
  postId?:        string;
  targetUserId?:  string;
  targetName?:    string;
}

export default function ReportModal({
  visible,
  onClose,
  postId,
  targetUserId,
  targetName,
}: ReportModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const insets = useSafeAreaInsets();

  const type    = postId ? 'post' : 'user';
  const reasons = postId ? POST_REASONS : USER_REASONS;

  const reset = () => {
    setSelected(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      // apiService.submitReport calls POST /reports
      // body: { type, reason, post_id?, target_user_id? }
      await apiService.submitReport({
        type,
        reason:         selected,
        post_id:        postId       || undefined,
        target_user_id: targetUserId || undefined,
      });
      handleClose();
      Alert.alert(
        'Đã gửi báo cáo ✓',
        'Cảm ơn bạn! Đội ngũ chúng tôi sẽ xem xét trong vòng 24 giờ.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert(
        'Gửi thất bại',
        err?.response?.data?.message || 'Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Báo cáo {type === 'post' ? 'bài viết' : 'người dùng'}
            </Text>
            {targetName && (
              <Text style={styles.sub}>
                {type === 'post' ? 'Đăng bởi ' : ''}
                <Text style={{ color: C.accent }}>@{targetName}</Text>
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <Text style={styles.prompt}>Tại sao bạn muốn báo cáo?</Text>

        {/* Reasons */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
          {reasons.map(r => {
            const active = selected === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.reasonRow, active && styles.reasonRowActive]}
                onPress={() => setSelected(r.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.reasonIcon, active && styles.reasonIconActive]}>
                  <Ionicons
                    name={r.icon as any}
                    size={16}
                    color={active ? C.accent : C.textSub}
                  />
                </View>
                <Text style={[styles.reasonLabel, active && styles.reasonLabelActive]}>
                  {r.label}
                </Text>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!selected || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitTxt}>Gửi báo cáo</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Báo cáo của bạn ẩn danh và được xem xét trong 24 giờ.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  title:   { fontSize: 18, fontWeight: '800', color: C.text },
  sub:     { fontSize: 13, color: C.textSub, marginTop: 2 },
  closeBtn:{
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: C.card,
    justifyContent: 'center',
    alignItems: 'center',
  },

  prompt: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 8,
    gap: 10,
  },
  reasonRowActive: {
    borderColor: C.accent + '60',
    backgroundColor: '#FFF3EA',
  },
  reasonIcon: {
    width: 34, height: 34,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonIconActive: { backgroundColor: '#FFE5D0' },
  reasonLabel:      { flex: 1, color: C.textSub, fontSize: 14, fontWeight: '500' },
  reasonLabelActive:{ color: C.text, fontWeight: '600' },

  radio: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: C.accent },
  radioDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: C.accent,
  },

  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  note: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
});