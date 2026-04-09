import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { apiService } from '../../services/Api.service';

interface Props {
  userId:           string;
  initialFollowing?: boolean;
  myId?:            string;       // hide button if viewing own profile
  size?:            'sm' | 'md' | 'lg';
  // FIX: Renamed to match the usage in PostCard
  onFollowToggle?: (userId: string, isNowFollowing: boolean) => void; 
}

export function FollowButton({
  userId,
  initialFollowing = false,
  myId,
  size = 'sm',
  onFollowToggle, // FIX: Destructure the correct name here
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy]           = useState(false);

  // Don't render on own posts / own profile
  if (!userId || userId === myId) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic update
    
    try {
      if (next) await apiService.followUser(userId);
      else      await apiService.unfollowUser(userId);
      
      // FIX: Call the correct prop name with the expected arguments
      onFollowToggle?.(userId, next); 
    } catch (err) {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  // Logic to select style based on size prop
  const st = size === 'sm' ? sm : md;

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={busy}
      activeOpacity={0.75}
      style={[st.btn, following && st.btnFollowing]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={following ? '#666666' : '#FFFFFF'}
        />
      ) : (
        <Text style={[st.txt, following && st.txtFollowing]}>
          {following ? 'Đang theo dõi' : 'Theo dõi'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BRAND = '#FF8C42';   // matches COLORS.primary

const sm = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical:   5,
    borderRadius:      14,
    backgroundColor:   BRAND,
    alignItems:        'center',
    justifyContent:    'center',
    minWidth:          70,
  },
  btnFollowing: {
    backgroundColor: '#F0F0F0',
    borderWidth:     1,
    borderColor:     '#E0E0E0',
  },
  txt: {
    color:      '#FFFFFF',
    fontSize:   12,
    fontWeight: '700',
  },
  txtFollowing: { color: '#555555' },
});

const md = StyleSheet.create({
  btn: {
    paddingHorizontal: 20,
    paddingVertical:   9,
    borderRadius:      22,
    backgroundColor:   BRAND,
    alignItems:        'center',
    justifyContent:    'center',
    minWidth:          96,
  },
  btnFollowing: {
    backgroundColor: '#F0F0F0',
    borderWidth:     1.5,
    borderColor:     '#E0E0E0',
  },
  txt: {
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '700',
  },
  txtFollowing: { color: '#444444' },
});