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
} from 'react-native';
import { apiService } from '../../services/Api.service';

// ─── Theme ───────────────────────────────────────────────────
const C = {
  bg:       '#0F0F14',
  surface:  '#17171F',
  card:     '#1E1E2A',
  border:   '#2A2A38',
  accent:   '#FF8C42',
  red:      '#EF4444',
  redSoft:  '#EF444418',
  text:     '#F0F0F5',
  textSub:  '#8888A0',
  textMuted:'#55556A',
  overlay:  'rgba(0,0,0,0.65)',
};

// ─── Reason options ───────────────────────────────────────────
const POST_REASONS = [
  { key: 'spam',         label: '🚫 Spam or misleading' },
  { key: 'inappropriate',label: '🔞 Inappropriate content' },
  { key: 'fake',         label: '🤥 Fake or misinformation' },
  { key: 'violence',     label: '⚠️  Violence or harmful' },
  { key: 'copyright',    label: '©️  Copyright violation' },
  { key: 'other',        label: '💬 Other' },
];

const USER_REASONS = [
  { key: 'harassment',   label: '😡 Harassment or bullying' },
  { key: 'spam',         label: '🚫 Spam account' },
  { key: 'fake',         label: '🤥 Fake account' },
  { key: 'inappropriate',label: '🔞 Inappropriate content' },
  { key: 'other',        label: '💬 Other' },
];

// ─── Props ────────────────────────────────────────────────────
interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  /** Report a post */
  postId?: string;
  /** Report a user */
  targetUserId?: string;
  /** Display name shown in the header */
  targetName?: string;
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
    if (!selected) return;
    setLoading(true);
    try {
      await apiService.submitReport({
        type,
        reason: selected,
        post_id:        postId        || undefined,
        target_user_id: targetUserId  || undefined,
      });
      handleClose();
      Alert.alert(
        'Report submitted',
        'Thank you — our team will review this shortly.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert(
        'Failed to submit',
        err?.response?.data?.message || 'Please try again.'
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
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Report {type}</Text>
            {targetName && (
              <Text style={styles.sub}>
                {type === 'post' ? 'Post by ' : ''}
                <Text style={{ color: C.accent }}>@{targetName}</Text>
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.prompt}>Why are you reporting this?</Text>

        {/* Reason list */}
        {reasons.map((r) => {
          const isActive = selected === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.reasonRow, isActive && styles.reasonRowActive]}
              onPress={() => setSelected(r.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.reasonLabel, isActive && styles.reasonLabelActive]}>
                {r.label}
              </Text>
              <View style={[styles.radio, isActive && styles.radioActive]}>
                {isActive && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !selected && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.submitTxt}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Reports are anonymous and reviewed within 24 hours.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  sub:   { color: C.textSub, fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: C.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: { color: C.textSub, fontSize: 14 },

  prompt: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 8,
  },
  reasonRowActive: {
    borderColor: C.accent + '80',
    backgroundColor: C.accent + '12',
  },
  reasonLabel: {
    flex: 1,
    color: C.textSub,
    fontSize: 14,
    fontWeight: '500',
  },
  reasonLabelActive: { color: C.text, fontWeight: '600' },

  radio: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
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
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.35 },
  submitTxt: { color: C.bg, fontSize: 15, fontWeight: '800' },

  note: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});