import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/Api.service'; // This is the instance of ApiService
import { COLORS } from '../../constants/theme';
import { Comment } from '../../types/post';

export function CommentModal({
  visible,
  onClose,
  postId,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);

  /* ---------- FETCH COMMENTS ---------- */
  useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // FIX: Use the typed method from your ApiService
      const data = await api.getPostComments(postId);
      setComments(data || []);
    } catch (err) {
      console.error("Fetch comments error:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SEND COMMENT (OPTIMISTIC) ---------- */
  const sendComment = async () => {
    if (!text.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const currentContent = text.trim();

    const optimisticComment: any = {
      id: tempId,
      content: currentContent,
      user: {
        username: 'Bạn',
        avatar_url: null,
      },
      pending: true,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setText('');
    setSending(true);

    // Scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // FIX: Use the specific addComment method from your ApiService
      const newComment = await api.addComment(postId, currentContent);

      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? newComment : c))
      );
    } catch (err) {
      // rollback if failed
      Alert.alert("Lỗi", "Không thể gửi bình luận");
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setText(currentContent); // Put text back so user doesn't lose it
    } finally {
      setSending(false);
    }
  };

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
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Bình luận</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* COMMENTS LIST */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Image
                  source={
                    item.user?.avatar_url
                      ? { uri: item.user.avatar_url }
                      : require('../../assets/images/avatar.png')
                  }
                  style={styles.avatar}
                />

                <View
                  style={[
                    styles.bubble,
                    (item as any).pending && styles.pendingBubble,
                  ]}
                >
                  <Text style={styles.username}>
                    {item.user?.username || 'Người dùng'}
                  </Text>
                  <Text style={styles.comment}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
            }
          />
        )}

        {/* INPUT */}
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Viết bình luận..."
            placeholderTextColor="#AAA"
            style={styles.input}
            value={text}
            onChangeText={setText}
            editable={!sending}
            multiline
          />

          <TouchableOpacity
            onPress={sendComment}
            disabled={!text.trim() || sending}
            style={styles.sendBtn}
          >
            {sending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
                <Ionicons
                  name="send"
                  size={22}
                  color={text.trim() ? COLORS.primary : '#AAA'}
                />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 4 },
  listContent: { paddingBottom: 20, paddingTop: 10 },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: '#EEE' },
  bubble: {
    backgroundColor: '#F1F2F6',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  pendingBubble: { opacity: 0.5 },
  username: { fontWeight: '700', marginBottom: 2, fontSize: 13, color: '#333' },
  comment: { fontSize: 14, lineHeight: 18, color: '#444' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#EEE',
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#333'
  },
  sendBtn: { paddingBottom: 8, paddingRight: 4 }
});