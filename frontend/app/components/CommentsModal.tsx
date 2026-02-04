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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../constants/theme';

type Comment = {
  id: string | number;
  content: string;
  created_at?: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
  pending?: boolean;
};

export function CommentModal({
  visible,
  onClose,
  postId,
}: {
  visible: boolean;
  onClose: () => void;
  postId: number;
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
      const res = await api.get(`/posts/${postId}/comments`);
      setComments(res.data.data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SEND COMMENT (OPTIMISTIC) ---------- */
  const sendComment = async () => {
    if (!text.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticComment: Comment = {
      id: tempId,
      content: text.trim(),
      user: {
        username: 'Bạn',
        avatar_url: null,
      },
      pending: true,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setText('');
    setSending(true);

    // scroll to bottom
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const res = await api.post(
        `/posts/${postId}/comments`,
        { content: optimisticComment.content }
      );

      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? res.data.data : c
        )
      );
    } catch {
      // rollback if failed
      setComments((prev) =>
        prev.filter((c) => c.id !== tempId)
      );
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
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Bình luận</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} />
          </TouchableOpacity>
        </View>

        {/* COMMENTS LIST */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Image
                  source={
                    item.user.avatar_url
                      ? { uri: item.user.avatar_url }
                      : require('../../assets/avatar.png')
                  }
                  style={styles.avatar}
                />

                <View
                  style={[
                    styles.bubble,
                    item.pending && styles.pendingBubble,
                  ]}
                >
                  <Text style={styles.username}>
                    {item.user.username}
                  </Text>
                  <Text style={styles.comment}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        {/* INPUT */}
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Viết bình luận..."
            style={styles.input}
            value={text}
            onChangeText={setText}
            editable={!sending}
          />

          <TouchableOpacity
            onPress={sendComment}
            disabled={!text.trim() || sending}
          >
            <Ionicons
              name="send"
              size={22}
              color={
                text.trim()
                  ? COLORS.primary
                  : '#AAA'
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },

  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    padding: 10,
    maxWidth: '85%',
  },
  pendingBubble: {
    opacity: 0.6,
  },
  username: {
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 13,
  },
  comment: {
    fontSize: 14,
    lineHeight: 18,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#EEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
});

