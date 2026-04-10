// ─── components/FollowButton.tsx ─────────────────────────────────────────────
// Reusable inline follow button used in PostCard header and anywhere else.
// Handles its own optimistic state — no store needed.
//
// Usage:
//   <FollowButton
//     userId="uuid-string"
//     initialFollowing={post.user.is_following}   // pass if known
//     myId={storeUser?.id}
//   />

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { apiService } from '../../services/Api.service';

interface Props {
  userId:            string;
  initialFollowing?: boolean;
  myId?:             string;          // hide button if viewing own profile
  size?:             'sm' | 'md';
  onFollowChange?:   (following: boolean) => void;
}

export function FollowButton({ userId, initialFollowing = false, myId, size = 'sm', onFollowChange }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy,      setBusy]      = useState(false);

  // Don't show button on own posts
  if (!userId || userId === myId) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) await apiService.followUser(userId);
      else      await apiService.unfollowUser(userId);
      onFollowChange?.(next);
    } catch {
      setFollowing(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  const s = size === 'sm' ? sm : md;

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={busy}
      activeOpacity={0.75}
      style={[s.btn, following && s.btnActive]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {busy
        ? <ActivityIndicator size="small" color={following ? '#666' : '#fff'} />
        : <Text style={[s.txt, following && s.txtActive]}>
            {following ? 'Following' : 'Follow'}
          </Text>}
    </TouchableOpacity>
  );
}

const sm = StyleSheet.create({
  btn:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', minWidth: 66 },
  btnActive: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  txt:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  txtActive: { color: '#333' },
});

const md = StyleSheet.create({
  btn:       { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center', minWidth: 90 },
  btnActive: { backgroundColor: '#F0F0F0', borderWidth: 1.5, borderColor: '#E0E0E0' },
  txt:       { color: '#fff', fontSize: 14, fontWeight: '700' },
  txtActive: { color: '#333' },
});