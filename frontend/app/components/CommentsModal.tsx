import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/Api.service';
import { COLORS } from '../../constants/theme';
import type { Comment } from '../../types/post';
import { useUserStore } from '../../store/userStore';

interface Props {
  visible:  boolean;
  onClose:  () => void;
  postId:   string;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins  < 1)  return 'Vừa xong';
  if (mins  < 60) return `${mins}p`;
  if (hours < 24) return `${hours}h`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export function CommentModal({ visible, onClose, postId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);

  const listRef   = useRef<FlatList>(null);
  const inputRef  = useRef<TextInput>(null);
  const currentUser = useUserStore(s => s.user);

  // ── Fetch on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    } else if (!visible) {
      // Reset when closed
      setText('');
    }
  }, [visible, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await api.getPostComments(postId);
      setComments(data || []);
    } catch (err) {
      console.error('[CommentModal] fetchComments error:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Send with optimistic update ────────────────────────────────────────────
  const sendComment = useCallback(async () => {
    const content = text.trim();
    if (!content || sending) return;

    const tempId = `temp-${Date.now()}`;

    // Optimistic comment — uses real user data if available
    const optimistic: Comment & { pending?: boolean } = {
      id:         tempId,
      content,
      created_at: new Date().toISOString(),
      user: {
        id:         currentUser?.id         ?? '',
        username:   currentUser?.username   ?? 'Bạn',
        avatar_url: currentUser?.avatar_url ?? null,
      },
      pending: true,
    };

    setComments(prev => [...prev, optimistic]);
    setText('');
    setSending(true);
    Keyboard.dismiss();

    // Scroll to new comment
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const newComment = await api.addComment(postId, content);
      // Replace temp with real comment from server
      setComments(prev => prev.map(c => c.id === tempId ? newComment : c));
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi bình luận. Vui lòng thử lại.');
      // Rollback
      setComments(prev => prev.filter(c => c.id !== tempId));
      setText(content); // restore text
    } finally {
      setSending(false);
    }
  }, [text, sending, postId, currentUser]);

  // ── Render comment ─────────────────────────────────────────────────────────
  const renderComment = useCallback(({ item }: { item: Comment & { pending?: boolean } }) => {
    const isPending = (item as any).pending;
    return (
      <View style={[s.commentRow, isPending && s.commentPending]}>
        {item.user?.avatar_url ? (
          <Image source={{ uri: item.user.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFb]}>
            <Text style={s.avatarChar}>{item.user?.username?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={s.bubble}>
          <View style={s.bubbleHeader}>
            <Text style={s.commentUser}>{item.user?.username ?? 'Người dùng'}</Text>
            <Text style={s.commentTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={s.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.handleBar} />
            <View style={s.headerRow}>
              <Text style={s.title}>Bình luận</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comment list */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={item => item.id}
              renderItem={renderComment}
              contentContainerStyle={comments.length === 0 ? s.emptyContainer : s.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Ionicons name="chatbubble-outline" size={44} color="#DDD" />
                  <Text style={s.emptyText}>Chưa có bình luận nào</Text>
                  <Text style={s.emptyHint}>Hãy là người đầu tiên! 💬</Text>
                </View>
              }
            />
          )}

          {/* Input row */}
          <View style={s.inputRow}>
            {currentUser?.avatar_url ? (
              <Image source={{ uri: currentUser.avatar_url }} style={s.inputAvatar} />
            ) : (
              <View style={[s.inputAvatar, s.avatarFb]}>
                <Text style={s.avatarChar}>{currentUser?.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}

            <TextInput
              ref={inputRef}
              placeholder="Viết bình luận..."
              placeholderTextColor="#AAAAAA"
              style={s.input}
              value={text}
              onChangeText={setText}
              editable={!sending}
              multiline
              maxLength={500}
              returnKeyType="default"
            />

            <TouchableOpacity
              onPress={sendComment}
              disabled={!text.trim() || sending}
              style={s.sendBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={22}
                  color={text.trim() ? COLORS.primary : '#CCCCCC'}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  handleBar: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  closeBtn: { padding: 4 },

  listContent:    { paddingVertical: 8, paddingHorizontal: 4 },
  emptyContainer: { flex: 1 },
  emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText:      { fontSize: 15, fontWeight: '600', color: '#555', marginTop: 12 },
  emptyHint:      { fontSize: 13, color: '#999' },

  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
    gap: 10,
  },
  commentPending: { opacity: 0.5 },

  avatar:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F0F0', flexShrink: 0 },
  avatarFb: { backgroundColor: '#FFF3EA', justifyContent: 'center', alignItems: 'center' },
  avatarChar:{ color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  bubble: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  commentUser:  { fontWeight: '700', fontSize: 13, color: '#1A1A1A' },
  commentTime:  { fontSize: 11, color: '#AAAAAA' },
  commentText:  { fontSize: 14, lineHeight: 20, color: '#333333' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 4 },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#333333',
  },
  sendBtn: { paddingBottom: 6 },
});