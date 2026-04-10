import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, Modal, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/Api.service';
import { useUserStore } from '../../store/userStore';
import { COLORS } from '../../constants/theme';
import { Comment } from '../../types/post';

// ── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800)return `${Math.floor(diff / 86400)} ngày`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

// ── Types ────────────────────────────────────────────────────────────────────
interface CommentWithMeta extends Comment {
  pending?: boolean;
}

interface Props {
  visible:  boolean;
  onClose:  () => void;
  postId:   string;
  /** Call this so the feed can update its comment count optimistically */
  onCountChange?: (delta: number) => void;
}

export function CommentModal({ visible, onClose, postId, onCountChange }: Props) {
  const insets    = useSafeAreaInsets();
  const meUser    = useUserStore(s => s.user);

  const [comments, setComments] = useState<CommentWithMeta[]>([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const listRef = useRef<FlatList>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPostComments(postId);
      setComments(data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible) { fetchComments(); }
    else { setComments([]); setText(''); }
  }, [visible, fetchComments]);

  // ── Send (optimistic) ─────────────────────────────────────────────────────
  const sendComment = async () => {
    if (!text.trim() || sending) return;

    const tempId      = `temp-${Date.now()}`;
    const currentText = text.trim();
    setText('');
    setSending(true);

    const optimistic: CommentWithMeta = {
      id:         tempId,
      content:    currentText,
      created_at: new Date().toISOString(),
      pending:    true,
      user: {
        id:         meUser?.id ?? '',
        username:   meUser?.username ?? 'Bạn',
        avatar_url: meUser?.avatar_url ?? '',
      },
    };

    setComments(prev => [...prev, optimistic]);
    onCountChange?.(+1);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);

    try {
      const confirmed = await api.addComment(postId, currentText);
      setComments(prev => prev.map(c => c.id === tempId ? confirmed : c));
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
      setComments(prev => prev.filter(c => c.id !== tempId));
      onCountChange?.(-1);
      setText(currentText); // restore text
    } finally {
      setSending(false);
    }
  };

  // ── Delete (own comment) ──────────────────────────────────────────────────
  const deleteComment = (comment: CommentWithMeta) => {
    if (comment.user?.id !== meUser?.id) return;
    Alert.alert('Xóa bình luận?', 'Bình luận này sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          // Optimistic remove
          setComments(prev => prev.filter(c => c.id !== comment.id));
          onCountChange?.(-1);
          try {
            await api.deleteComment(postId, comment.id);
          } catch {
            // Restore on failure
            setComments(prev => {
              const idx = prev.findIndex(c => c.created_at < comment.created_at);
              const copy = [...prev];
              copy.splice(idx === -1 ? copy.length : idx, 0, comment);
              return copy;
            });
            onCountChange?.(+1);
            Alert.alert('Lỗi', 'Không thể xóa bình luận');
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bình luận</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Chưa có bình luận nào.{'\n'}Hãy là người đầu tiên!
              </Text>
            }
            renderItem={({ item }) => {
              const isOwn = item.user?.id === meUser?.id;
              return (
                <View style={styles.commentRow}>
                  {/* Avatar */}
                  {item.user?.avatar_url
                    ? <Image source={{ uri: item.user.avatar_url }} style={styles.avatar as ImageStyle} />
                    : <View style={[styles.avatar as object, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>{item.user?.username?.[0]?.toUpperCase() || '?'}</Text>
                      </View>}

                  {/* Bubble */}
                  <View style={styles.bubbleWrap}>
                    <View style={[styles.bubble, item.pending && styles.pendingBubble]}>
                      <Text style={styles.username}>{item.user?.username || 'Người dùng'}</Text>
                      <Text style={styles.comment}>{item.content}</Text>
                    </View>
                    <View style={styles.meta}>
                      {item.created_at && !item.pending && (
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                      )}
                      {item.pending && <Text style={styles.time}>Đang gửi…</Text>}
                    </View>
                  </View>

                  {/* Delete button — own comments only */}
                  {isOwn && !item.pending && (
                    <TouchableOpacity
                      onPress={() => deleteComment(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="#CCC" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {meUser?.avatar_url
            ? <Image source={{ uri: meUser.avatar_url }} style={styles.inputAvatar as ImageStyle} />
            : <View style={[styles.inputAvatar as object, styles.avatarFallback]}>
                <Text style={[styles.avatarInitial, { fontSize: 12 }]}>{meUser?.username?.[0]?.toUpperCase() || '?'}</Text>
              </View>}
          <TextInput
            placeholder="Viết bình luận..."
            placeholderTextColor="#AAA"
            style={styles.input}
            value={text}
            onChangeText={setText}
            editable={!sending}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendComment}
          />
          <TouchableOpacity
            onPress={sendComment}
            disabled={!text.trim() || sending}
            style={styles.sendBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {sending
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="send" size={22} color={text.trim() ? COLORS.primary : '#CCC'} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FFF' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { padding: 16, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:          { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  closeBtn:       { padding: 4 },
  listContent:    { paddingBottom: 12, paddingTop: 8 },
  emptyText:      { textAlign: 'center', color: '#999', marginTop: 60, fontSize: 14, lineHeight: 22 },
  commentRow:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-start' },
  avatar:         { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: '#EEE' },
  avatarFallback: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  bubbleWrap:     { flex: 1 },
  bubble:         { backgroundColor: '#F1F2F6', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', maxWidth: '100%' },
  pendingBubble:  { opacity: 0.5 },
  username:       { fontWeight: '700', marginBottom: 2, fontSize: 13, color: '#333' },
  comment:        { fontSize: 14, lineHeight: 19, color: '#444' },
  meta:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, paddingHorizontal: 4 },
  time:           { fontSize: 11, color: '#999' },
  deleteBtn:      { paddingTop: 10, paddingLeft: 8 },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderColor: '#EEE' },
  inputAvatar:    { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginBottom: 6, backgroundColor: '#EEE' },
  input:          { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 15, maxHeight: 100, color: '#333' },
  sendBtn:        { paddingBottom: 10 },
});