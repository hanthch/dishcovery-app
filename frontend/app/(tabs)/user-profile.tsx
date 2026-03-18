import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Alert,
  ActivityIndicator, ImageStyle, Linking, Dimensions, RefreshControl,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, Switch,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { apiService } from '../../services/Api.service';
import { useUserStore } from '../../store/userStore';
import { Restaurant } from '../../types/restaurant';
import { Post } from '../../types/post';
import { User } from '../../types/auth';
import { PostCard } from '../components/post-card';
import { COLORS } from '../../constants/theme';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  primary: COLORS.primary,        // synced with theme.ts (#FF8C42)
  soft: '#FFF0EB', dark: '#1A1A1A', mid: '#666',
  light: '#999', border: '#F0F0F0', bg: '#FAFAFA', white: '#FFF', red: '#EF4444',
};
const { width: W } = Dimensions.get('window');
const GRID = (W - 3) / 3;

const BADGES: Record<string, string> = {
  pioneer: '🌟 Người Tiên Phong', 
  scout: '🔍 Người Săn Quán', 
  explorer: '🗺️ Người Khám Phá',
  trailblazer: '🏔️ Người Dẫn Dắt', 
  legend: '👑 Người Truyền Cảm Hứng',
};

const StatPill = ({ count, label, onPress }: { count: number; label: string; onPress?: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={st.statBox}>
    <Text style={st.statNum}>{count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count}</Text>
    <Text style={st.statLbl}>{label}</Text>
  </TouchableOpacity>
);

const TabIcon = ({ active, icon, iconOn, onPress }: { active: boolean; icon: any; iconOn: any; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[st.tab, active && st.tabActive]} activeOpacity={0.7}>
    <Ionicons name={active ? iconOn : icon} size={22} color={active ? C.primary : C.light} />
  </TouchableOpacity>
);

function EditModal({ visible, user, onClose, onSaved }: {
  visible: boolean; user: User; onClose: () => void; onSaved: (u: User) => void;
}) {
  const [username,        setUsername]        = useState('');
  const [fullName,        setFullName]        = useState('');
  const [bio,             setBio]             = useState('');
  const [avatar,          setAvatar]          = useState('');
  const [avatarLocal,     setAvatarLocal]     = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [err,             setErr]             = useState('');

  useEffect(() => {
    if (visible) {
      setUsername(user.username || '');
      setFullName((user as any).full_name || '');
      setBio(user.bio || '');
      setAvatar(user.avatar_url || '');
      setAvatarLocal(null);
      setErr('');
    }
  }, [visible, user]);

  const requestPermission = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const uploadAvatar = async (localUri: string) => {
    setAvatarLocal(localUri);
    setUploadingAvatar(true);
    setErr('');
    try {
      const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      const result = await apiService.uploadFileToCloudinary(
        { uri: localUri, mimeType: mime, fileName: `avatar.${ext}` },
        { folder: 'dishcovery/avatars' }
      );
      setAvatar(result.secure_url);
    } catch {
      setErr('Tải ảnh lên thất bại. Vui lòng thử lại.');
      setAvatarLocal(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromLibrary = async () => {
    const ok = await requestPermission('library');
    if (!ok) { Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh trong Cài đặt.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) await uploadAvatar(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const ok = await requestPermission('camera');
    if (!ok) { Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền sử dụng camera trong Cài đặt.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) await uploadAvatar(result.assets[0].uri);
  };

  const onAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Hủy', 'Chọn từ thư viện', 'Chụp ảnh mới', ...(avatar ? ['Xóa ảnh đại diện'] : [])],
          cancelButtonIndex: 0,
          destructiveButtonIndex: avatar ? 3 : undefined,
        },
        (idx) => {
          if (idx === 1) pickFromLibrary();
          else if (idx === 2) pickFromCamera();
          else if (idx === 3 && avatar) { setAvatar(''); setAvatarLocal(null); }
        }
      );
    } else {
      const opts: any[] = [
        { text: 'Chọn từ thư viện', onPress: pickFromLibrary },
        { text: 'Chụp ảnh mới',     onPress: pickFromCamera  },
      ];
      if (avatar) opts.push({ text: 'Xóa ảnh đại diện', style: 'destructive', onPress: () => { setAvatar(''); setAvatarLocal(null); } });
      opts.push({ text: 'Hủy', style: 'cancel' });
      Alert.alert('Ảnh đại diện', 'Chọn hành động', opts);
    }
  };

  const save = async () => {
    if (!username.trim()) { setErr('Tên người dùng không được để trống'); return; }
    if (uploadingAvatar)  { setErr('Vui lòng chờ ảnh tải lên xong'); return; }
    setSaving(true); setErr('');
    try {
      const updated = await apiService.updateProfile({
        username:   username.trim(),
        full_name:  fullName.trim(),
        bio:        bio.trim(),
        avatar_url: avatar || undefined,
      });
      onSaved(updated);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.response?.data?.message || 'Cập nhật thất bại');
    } finally { setSaving(false); }
  };

  const displayUri = avatarLocal || avatar || null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheet}>
          {/* Header */}
          <View style={st.sheetHead}>
            <TouchableOpacity onPress={onClose} style={st.headBtn}>
              <Text style={st.headCancel}>Hủy</Text>
            </TouchableOpacity>
            <Text style={st.sheetTitle}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={save} style={st.headBtn} disabled={saving || uploadingAvatar}>
              {saving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={[st.headSave, uploadingAvatar && { opacity: 0.4 }]}>Lưu</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ── Tappable Avatar ── */}
            <View style={st.editAvatarRow}>
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={st.avatarTapWrap} disabled={uploadingAvatar}>
                {displayUri ? (
                  <Image source={{ uri: displayUri }} style={st.editAvatar as ImageStyle} />
                ) : (
                  <View style={[st.editAvatar as object, st.avatarFallback]}>
                    <Text style={st.avatarInitial}>{username[0]?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                {/* Camera badge overlay */}
                <View style={st.cameraBadge}>
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.7} disabled={uploadingAvatar} style={{ marginTop: 10 }}>
                <Text style={st.changeAvatarTxt}>
                  {uploadingAvatar ? 'Đang tải lên…' : 'Thay đổi ảnh đại diện'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fields */}
            <View style={st.editBody}>
              {err ? <View style={st.errBox}><Text style={st.errTxt}>{err}</Text></View> : null}
              <Text style={st.lbl}>Tên người dùng *</Text>
              <TextInput style={st.field} value={username} onChangeText={setUsername}
                placeholder="username" placeholderTextColor={C.light}
                autoCapitalize="none" autoCorrect={false} maxLength={30} />
              <Text style={st.lbl}>Họ và tên</Text>
              <TextInput style={st.field} value={fullName} onChangeText={setFullName}
                placeholder="Nguyễn Văn A" placeholderTextColor={C.light} />
              <Text style={st.lbl}>Bio</Text>
              <TextInput style={[st.field, st.fieldTall]} value={bio} onChangeText={setBio}
                placeholder="Giới thiệu bản thân..." placeholderTextColor={C.light}
                multiline numberOfLines={4} maxLength={160} />
              <Text style={st.charCount}>{bio.length}/160</Text>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingsModal({ visible, onClose, navigation }: {
  visible: boolean; onClose: () => void; navigation?: any;
}) {
  const logout  = useUserStore(s => s.logout);
  const user    = useUserStore(s => s.user);
  const [notifs, setNotifs] = useState(true);

  const doLogout = () => Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Đăng xuất', style: 'destructive', onPress: async () => { onClose(); await logout(); } },
  ]);

  const doDelete = () => Alert.alert(
    'Xóa tài khoản',
    'Tất cả dữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn có chắc chắn?',
    [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa tài khoản', style: 'destructive', onPress: async () => {
        try { await apiService.deleteAccount(); onClose(); await logout(); }
        catch { Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại.'); }
      }},
    ]
  );

  type RowProps = { icon: any; label: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode };
  const Row = ({ icon, label, onPress, danger, right }: RowProps) => (
    <TouchableOpacity style={st.settRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[st.settIcon, { backgroundColor: danger ? C.red + '18' : C.primary + '18' }]}>
        <Ionicons name={icon} size={18} color={danger ? C.red : C.primary} />
      </View>
      <Text style={[st.settLabel, danger && { color: C.red }]}>{label}</Text>
      {right !== undefined ? right : (onPress ? <Ionicons name="chevron-forward" size={16} color={C.light} /> : null)}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.settingsSheet}>
        <View style={st.sheetHead}>
          <View style={st.headBtn} />
          <Text style={st.sheetTitle}>Cài đặt</Text>
          <TouchableOpacity onPress={onClose} style={st.headBtn}>
            <Ionicons name="close" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Account card */}
          <View style={[st.settGroup, { marginTop: 16 }]}>
            <View style={st.accountCard}>
              {user?.avatar_url
                ? <Image source={{ uri: user.avatar_url }} style={st.accAvatar as ImageStyle} />
                : <View style={[st.accAvatar as object, st.avatarFallback]}>
                    <Text style={[st.avatarInitial, { fontSize: 20 }]}>{user?.username?.[0]?.toUpperCase() || '?'}</Text>
                  </View>}
              <View style={{ flex: 1 }}>
                <Text style={st.accName}>{user?.username}</Text>
                <Text style={st.accSub} numberOfLines={1}>{(user as any)?.full_name || 'Dishcovery User'}</Text>
              </View>
              {(user as any)?.role === 'admin' && (
                <View style={st.adminPill}><Text style={st.adminPillTxt}>Admin</Text></View>
              )}
            </View>
          </View>

          <Text style={st.groupLabel}>THÔNG BÁO</Text>
          <View style={st.settGroup}>
            <Row icon="notifications-outline" label="Thông báo đẩy"
              right={<Switch value={notifs} onValueChange={setNotifs}
                trackColor={{ false: C.border, true: C.primary + '60' }}
                thumbColor={notifs ? C.primary : '#ccc'} />} />
          </View>

          <Text style={st.groupLabel}>HỖ TRỢ</Text>
          <View style={st.settGroup}>
            <Row icon="shield-outline"            label="Chính sách bảo mật"
              onPress={() => Linking.openURL('https://dishcovery.app/privacy')} />
            <Row icon="document-text-outline"     label="Điều khoản sử dụng"
              onPress={() => Linking.openURL('https://dishcovery.app/terms')} />
            <Row icon="mail-outline"              label="Liên hệ hỗ trợ"
              onPress={() => Linking.openURL('mailto:support@dishcovery.app')} />
            <Row icon="information-circle-outline" label="Phiên bản 1.0.0" />
          </View>

          {(user as any)?.role === 'admin' && (
            <>
              <Text style={st.groupLabel}>QUẢN TRỊ</Text>
              <View style={st.settGroup}>
                <Row icon="shield-checkmark" label="Trang quản trị Admin"
                  onPress={() => { onClose(); navigation?.navigate('AdminApp'); }} />
              </View>
            </>
          )}

          <Text style={st.groupLabel}>TÀI KHOẢN</Text>
          <View style={st.settGroup}>
            <Row icon="log-out-outline" label="Đăng xuất"     onPress={doLogout} danger />
            <Row icon="trash-outline"   label="Xóa tài khoản" onPress={doDelete} danger />
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function SocialModal({ visible, kind, targetId, onClose, onUserPress, myId }: {
  visible: boolean; kind: 'followers' | 'following' | null;
  targetId: string; onClose: () => void; onUserPress: (id: string) => void;
  myId?: string;
}) {
  const [list,     setList]     = useState<User[]>([]);
  const [loading,  setLoad]     = useState(false);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [busy,     setBusy]     = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible || !kind || !targetId) return;
    setLoad(true); setList([]); setFollowed({});
    const req = kind === 'followers'
      ? apiService.getUserFollowers(targetId)
      : apiService.getUserFollowing(targetId);
    req.then(users => {
      setList(users);
      // seed follow state from is_following if present
      const seed: Record<string, boolean> = {};
      users.forEach((u: any) => { if (u.is_following) seed[String(u.id)] = true; });
      setFollowed(seed);
    }).catch(() => {}).finally(() => setLoad(false));
  }, [visible, kind, targetId]);

  const toggleFollow = async (uid: string, currently: boolean) => {
    if (busy[uid]) return;
    setBusy(p => ({ ...p, [uid]: true }));
    try {
      if (currently) { await apiService.unfollowUser(uid); setFollowed(p => ({ ...p, [uid]: false })); }
      else           { await apiService.followUser(uid);   setFollowed(p => ({ ...p, [uid]: true  })); }
    } catch { Alert.alert('Lỗi', 'Thao tác thất bại'); }
    finally  { setBusy(p => ({ ...p, [uid]: false })); }
  };

  return (
    <Modal visible={!!visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.settingsSheet}>
        <View style={st.sheetHead}>
          <View style={st.headBtn} />
          <Text style={st.sheetTitle}>{kind === 'followers' ? 'Followers' : 'Đang theo dõi'}</Text>
          <TouchableOpacity onPress={onClose} style={st.headBtn}>
            <Ionicons name="close" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={st.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : (
          <FlatList
            data={list} keyExtractor={i => String(i.id)}
            renderItem={({ item }) => {
              const uid      = String(item.id);
              const isSelf   = uid === myId;
              const isF      = !!followed[uid];
              const isBusy   = !!busy[uid];
              return (
                <View style={st.socialRow}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => { onClose(); onUserPress(uid); }} activeOpacity={0.7}>
                    {item.avatar_url
                      ? <Image source={{ uri: item.avatar_url }} style={st.socialAvatar as ImageStyle} />
                      : <View style={[st.socialAvatar as object, st.avatarFallback]}>
                          <Text style={[st.avatarInitial, { fontSize: 18 }]}>{item.username?.[0]?.toUpperCase() || '?'}</Text>
                        </View>}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={st.socialName}>{item.username}</Text>
                      {(item as any).full_name ? <Text style={st.socialSub}>{(item as any).full_name}</Text> : null}
                      <Text style={st.socialCount}>{((item as any).followers_count || 0).toLocaleString()} followers</Text>
                    </View>
                  </TouchableOpacity>
                  {!isSelf && (
                    <TouchableOpacity
                      style={[st.socialFollowBtn, isF && st.socialFollowBtnActive]}
                      onPress={() => toggleFollow(uid, isF)}
                      disabled={isBusy} activeOpacity={0.8}>
                      {isBusy
                        ? <ActivityIndicator size="small" color={isF ? C.dark : '#fff'} />
                        : <Text style={[st.socialFollowTxt, isF && st.socialFollowTxtActive]}>
                            {isF ? 'Following' : 'Follow'}
                          </Text>}
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={st.center}>
                <Ionicons name="people-outline" size={48} color={C.border} />
                <Text style={st.emptyTxt}>{kind === 'followers' ? 'Chưa có followers' : 'Chưa theo dõi ai'}</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

interface Props {
  userId?: string | number;
  isOwnProfile?: boolean;
  onClose?: () => void;
  onPostPress?: (post: Post) => void;
  onUserPress?: (userId: string) => void;
  navigation?: any;
  route?: any;
}

export function UserProfileScreen({
  userId, isOwnProfile: ownProp = false,
  onClose, onPostPress, onUserPress, navigation, route,
}: Props) {
  const insets        = useSafeAreaInsets();
  const storeUser     = useUserStore(s => s.user);
  const fetchMe       = useUserStore(s => s.fetchCurrentUser);
  const updateStore   = useUserStore(s => s.updateUserProfile);
  const routeId    = route?.params?.userId;
  const resolvedId = userId || routeId;
  const isOwn      = ownProp || !resolvedId;

  const [user,         setUser]        = useState<User | null>(null);
  const [posts,        setPosts]       = useState<Post[]>([]);
  const [saved,        setSaved]       = useState<Post[]>([]);
  const [savedRest,    setSavedRest]   = useState<Restaurant[]>([]);
  const [tab,          setTab]         = useState<'posts' | 'saved_posts' | 'saved_rest'>('posts');
  const [following,    setFollowing]   = useState(false);
  const [followBusy,   setFollowBusy]  = useState(false);
  const [pLoading,     setPLoading]    = useState(true);
  const [tLoading,     setTLoading]    = useState(false);
  const [refreshing,   setRefreshing]  = useState(false);
  const [showEdit,     setShowEdit]    = useState(false);
  const [showSettings, setShowSett]    = useState(false);
  const [socialKind,   setSocialKind]  = useState<'followers' | 'following' | null>(null);
  const [showAvatar,   setShowAvatar]  = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!isOwn) return;
    if (storeUser) { setUser(storeUser); setPLoading(false); }
    fetchMe().finally(() => setPLoading(false));
  }, [isOwn]);

  useEffect(() => {
    if (isOwn && storeUser) setUser(storeUser);
  }, [isOwn, storeUser]);

  const loadProfile = useCallback(async () => {
    if (isOwn || !resolvedId) return;
    setPLoading(true);
    try {
      const p = await apiService.getUserProfile(String(resolvedId));
      setUser(p);
      setFollowing(!!(p as any).is_following);
    } catch { Alert.alert('Lỗi', 'Không thể tải hồ sơ'); }
    finally { setPLoading(false); }
  }, [resolvedId, isOwn]);

  useEffect(() => { if (!isOwn && resolvedId) loadProfile(); }, [loadProfile]);

  const loadTab = useCallback(async () => {
    const tid = user?.id ?? (isOwn ? storeUser?.id : undefined);
    if (!tid) return;
    setTLoading(true);
    try {
      if (tab === 'posts')       setPosts(await apiService.getUserPosts(String(tid)));
      if (tab === 'saved_posts') setSaved(await apiService.getSavedPosts());
      if (tab === 'saved_rest')  setSavedRest(await apiService.getSavedRestaurants());
    } catch {}
    finally { setTLoading(false); }
  }, [tab, user?.id, isOwn, storeUser?.id]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([isOwn ? fetchMe() : loadProfile(), loadTab()]);
    setRefreshing(false);
  }, [isOwn, fetchMe, loadProfile, loadTab]);

  const toggleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await apiService.unfollowUser(String(user.id));
        setFollowing(false);
        setUser(p => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) - 1) } : p);
      } else {
        await apiService.followUser(String(user.id));
        setFollowing(true);
        setUser(p => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p);
      }
    } catch { Alert.alert('Lỗi', 'Thao tác thất bại. Vui lòng thử lại.'); }
    finally { setFollowBusy(false); }
  };

  // Free Google Maps — opens native Maps app, no API key needed
  const openMap = (address?: string | null, lat?: number | null, lng?: number | null) => {
    let url: string;
    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else { Alert.alert('Không có địa chỉ', 'Quán này chưa có thông tin vị trí.'); return; }
    Linking.openURL(url).catch(() => Alert.alert('Lỗi', 'Không thể mở bản đồ'));
  };

  const listData = (): (Post | Restaurant)[] =>
    tab === 'posts' ? posts : tab === 'saved_posts' ? saved : savedRest;

  const Header = () => {
    if (!user) return (
      <View style={st.skelBox}><ActivityIndicator size="large" color={C.primary} /></View>
    );
    return (
      <View>
        {/* Avatar + stats */}
        <View style={st.topRow}>
          <TouchableOpacity
            style={st.avatarWrap}
            onPress={() => user.avatar_url && setShowAvatar(true)}
            activeOpacity={user.avatar_url ? 0.85 : 1}>
            {user.avatar_url
              ? <Image source={{ uri: user.avatar_url }} style={st.avatar as ImageStyle} />
              : <View style={[st.avatar as object, st.avatarFallback]}>
                  <Text style={st.avatarInitial}>{user.username?.[0]?.toUpperCase() || '?'}</Text>
                </View>}
          </TouchableOpacity>
          <View style={st.statsRow}>
            <StatPill count={user.posts_count || 0} label="Bài viết" />
            <StatPill count={user.followers_count || 0} label="Followers" onPress={() => setSocialKind('followers')} />
            <StatPill count={user.following_count || 0} label="Following" onPress={() => setSocialKind('following')} />
          </View>
        </View>

        {/* Bio */}
        <View style={st.bioWrap}>
          <View style={st.nameRow}>
            <Text style={st.username}>{user.username}</Text>
            {(user.scout_points ?? 0) > 0 && (
              <View style={st.ptsBadge}>
                <Ionicons name="flame" size={12} color={C.primary} />
                <Text style={st.ptsTxt}>{user.scout_points} pts</Text>
              </View>
            )}
            {(user as any).role === 'admin' && (
              <View style={[st.ptsBadge, { backgroundColor: '#FF8C4218' }]}>
                <Ionicons name="shield-checkmark" size={12} color="#FF8C42" />
                <Text style={[st.ptsTxt, { color: '#FF8C42' }]}>Admin</Text>
              </View>
            )}
          </View>
          {(user as any).full_name ? <Text style={st.fullName}>{(user as any).full_name}</Text> : null}
          {user.bio
            ? <Text style={st.bio}>{user.bio}</Text>
            : isOwn
              ? <TouchableOpacity onPress={() => setShowEdit(true)}>
                  <Text style={st.bioHint}>+ Thêm bio để giới thiệu bản thân...</Text>
                </TouchableOpacity>
              : null}
          {(user.contributions ?? 0) > 0 && (
            <View style={st.contribRow}>
              <Ionicons name="location" size={13} color={C.primary} />
              <Text style={st.contribTxt}>Đã đóng góp {user.contributions} địa điểm</Text>
            </View>
          )}
          {user.badges && user.badges.length > 0 && (
            <View style={st.badgeRow}>
              {user.badges.map(b => (
                <View key={b} style={st.badge}><Text style={st.badgeTxt}>{BADGES[b] || b}</Text></View>
              ))}
            </View>
          )}
        </View>

        {!isOwn ? (
          <View style={st.btnRow}>
            <TouchableOpacity style={[st.followBtn, following && st.followingBtn]}
              onPress={toggleFollow} activeOpacity={0.8} disabled={followBusy}>
              {followBusy
                ? <ActivityIndicator size="small" color={following ? C.dark : '#fff'} />
                : <Text style={[st.followTxt, following && st.followingTxt]}>
                    {following ? '✓ Đang Follow' : 'Follow'}
                  </Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.btnRow}>
            <TouchableOpacity style={st.editBtn} activeOpacity={0.8} onPress={() => setShowEdit(true)}>
              <Ionicons name="pencil-outline" size={15} color={C.dark} style={{ marginRight: 6 }} />
              <Text style={st.editTxt}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.settBtn} activeOpacity={0.8} onPress={() => setShowSett(true)}>
              <Ionicons name="settings-outline" size={20} color={C.dark} />
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={st.tabBar}>
          <TabIcon active={tab === 'posts'} icon="grid-outline" iconOn="grid" onPress={() => setTab('posts')} />
          {isOwn && <>
            <TabIcon active={tab === 'saved_posts'} icon="bookmark-outline" iconOn="bookmark" onPress={() => setTab('saved_posts')} />
            <TabIcon active={tab === 'saved_rest'} icon="restaurant-outline" iconOn="restaurant" onPress={() => setTab('saved_rest')} />
          </>}
        </View>
      </View>
    );
  };

  // ── Grid / list items ────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Post | Restaurant; index: number }) => {
    if (tab === 'saved_rest') {
      const r = item as Restaurant;
      const hasLocation = !!(r.latitude || r.longitude || r.address);
      return (
        <TouchableOpacity style={st.resCard}
          onPress={() => navigation?.navigate('RestaurantDetail', { restaurantId: r.id })}
          activeOpacity={0.8}>
          {r.image_url || r.cover_image
            ? <Image source={{ uri: (r.image_url || r.cover_image)! }} style={st.resThumb as ImageStyle} />
            : <View style={[st.resThumb as object, st.resThumbEmpty]}>
                <Ionicons name="restaurant" size={28} color={C.border} />
              </View>}
          <View style={st.resBody}>
            <Text style={st.resName} numberOfLines={1}>{r.name}</Text>
            {r.address ? <Text style={st.resAddr} numberOfLines={1}>{r.address}</Text> : null}
            <View style={st.resMeta}>
              {r.food_types?.[0] && <View style={st.resTag}><Text style={st.resTagTxt}>{r.food_types[0]}</Text></View>}
              {r.rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={11} color="#FFB800" />
                  <Text style={st.resStar}>{r.rating.toFixed(1)}</Text>
                </View>
              )}
              {r.is_saved && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="bookmark" size={11} color={C.primary} />
                </View>
              )}
            </View>
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            {hasLocation && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); openMap(r.address, r.latitude, r.longitude); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={st.mapBtn}>
                <Ionicons name="navigate-outline" size={16} color={C.primary} />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={18} color={C.light} />
          </View>
        </TouchableOpacity>
      );
    }
    const p = item as Post;
    const handlePostPress = () => {
      if (onPostPress) { onPostPress(p); }
      else { setSelectedPost(p); }
    };
    return (
      <TouchableOpacity style={[st.gridCell, index % 3 !== 2 && st.gridGap]}
        onPress={handlePostPress} activeOpacity={0.85}>
        {p.image_url || p.images?.[0]
          ? <Image source={{ uri: p.image_url || p.images![0] }} style={st.gridImg as ImageStyle} />
          : <View style={st.gridEmpty}><Ionicons name="image-outline" size={24} color={C.border} /></View>}
        {/* Multiple images indicator */}
        {(p.images?.length ?? 0) > 1 && (
          <View style={st.multiImgBadge} pointerEvents="none">
            <Ionicons name="copy-outline" size={13} color="#fff" />
          </View>
        )}
        {(p.likes_count || 0) > 0 && (
          <View style={st.gridBadge}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={st.gridBadgeTxt}>{p.likes_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const Empty = () => {
    if (tLoading) return null;
    const map = {
      posts:       { icon: 'camera-outline',     txt: 'Chưa có bài viết nào' },
      saved_posts: { icon: 'bookmark-outline',   txt: 'Chưa lưu bài viết nào' },
      saved_rest:  { icon: 'restaurant-outline', txt: 'Chưa lưu quán ăn nào' },
    } as Record<string, any>;
    const { icon, txt } = map[tab];
    return <View style={st.emptyBox}><Ionicons name={icon} size={48} color={C.border} /><Text style={st.emptyTxt}>{txt}</Text></View>;
  };

  const cols = tab === 'saved_rest' ? 1 : 3;

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      {/* Top nav */}
      <View style={st.nav}>
        {!isOwn
          ? <TouchableOpacity style={st.navBtn} onPress={() => { onClose?.(); navigation?.goBack(); }}>
              <Ionicons name="chevron-back" size={26} color={C.dark} />
            </TouchableOpacity>
          : <View style={st.navBtn} />}
        <Text style={st.navTitle} numberOfLines={1}>{user?.username || 'Hồ sơ'}</Text>
        {isOwn
          ? <TouchableOpacity style={st.navBtn} onPress={() => setShowSett(true)}>
              <Ionicons name="menu-outline" size={26} color={C.dark} />
            </TouchableOpacity>
          : <TouchableOpacity style={st.navBtn}
              onPress={() => Alert.alert('Tùy chọn', undefined, [
                { text: 'Báo cáo tài khoản', style: 'destructive', onPress: () =>
                  Alert.alert('Lý do báo cáo', undefined, [
                    { text: 'Spam hoặc quảng cáo', onPress: async () => {
                      try { await apiService.submitReport({ type: 'user', reason: 'Spam hoặc quảng cáo', target_user_id: String(user?.id) });
                        Alert.alert('Đã gửi báo cáo ✓', 'Cảm ơn bạn đã phản hồi. Chúng tôi sẽ xem xét sớm.'); }
                      catch { Alert.alert('Lỗi', 'Không thể gửi báo cáo. Thử lại sau.'); }
                    }},
                    { text: 'Nội dung không phù hợp', onPress: async () => {
                      try { await apiService.submitReport({ type: 'user', reason: 'Nội dung không phù hợp', target_user_id: String(user?.id) });
                        Alert.alert('Đã gửi báo cáo ✓', 'Cảm ơn bạn đã phản hồi. Chúng tôi sẽ xem xét sớm.'); }
                      catch { Alert.alert('Lỗi', 'Không thể gửi báo cáo. Thử lại sau.'); }
                    }},
                    { text: 'Giả mạo danh tính', onPress: async () => {
                      try { await apiService.submitReport({ type: 'user', reason: 'Giả mạo danh tính', target_user_id: String(user?.id) });
                        Alert.alert('Đã gửi báo cáo ✓', 'Cảm ơn bạn đã phản hồi. Chúng tôi sẽ xem xét sớm.'); }
                      catch { Alert.alert('Lỗi', 'Không thể gửi báo cáo. Thử lại sau.'); }
                    }},
                    { text: 'Quấy rối hoặc bạo lực', onPress: async () => {
                      try { await apiService.submitReport({ type: 'user', reason: 'Quấy rối hoặc bạo lực', target_user_id: String(user?.id) });
                        Alert.alert('Đã gửi báo cáo ✓', 'Cảm ơn bạn đã phản hồi. Chúng tôi sẽ xem xét sớm.'); }
                      catch { Alert.alert('Lỗi', 'Không thể gửi báo cáo. Thử lại sau.'); }
                    }},
                    { text: 'Hủy', style: 'cancel' },
                  ])},
                { text: 'Hủy', style: 'cancel' },
              ])}>
              <Ionicons name="ellipsis-horizontal" size={22} color={C.dark} />
            </TouchableOpacity>}
      </View>

      {pLoading && !user
        ? <View style={st.center}><ActivityIndicator size="large" color={C.primary} /></View>
        : <FlatList
            key={`${cols}-${tab}`}
            data={listData() as any[]}
            numColumns={cols}
            ListHeaderComponent={<Header />}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            ListEmptyComponent={<Empty />}
            ListFooterComponent={tLoading
              ? <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={C.primary} />
                </View> : null}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                tintColor={C.primary} colors={[C.primary]} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />}

      {/* Edit profile */}
      {user && isOwn && (
        <EditModal visible={showEdit} user={user} onClose={() => setShowEdit(false)}
          onSaved={u => { setUser(u); updateStore(u); setShowEdit(false); }} />
      )}

      {/* Settings */}
      <SettingsModal visible={showSettings} onClose={() => setShowSett(false)} navigation={navigation} />

      {/* Post detail modal — replaces PostDetail screen navigation */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={[st.nav, { paddingTop: insets.top }]}>
            <TouchableOpacity style={st.navBtn} onPress={() => setSelectedPost(null)}>
              <Ionicons name="chevron-back" size={26} color={C.dark} />
            </TouchableOpacity>
            <Text style={st.navTitle}>Bài viết</Text>
            <View style={st.navBtn} />
          </View>
          {selectedPost && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <PostCard
                post={selectedPost}
                onLike={async () => {
                  try {
                    if (selectedPost.is_liked) await apiService.unlikePost(String(selectedPost.id));
                    else await apiService.likePost(String(selectedPost.id));
                    setSelectedPost(p => p ? {
                      ...p,
                      is_liked: !p.is_liked,
                      likes_count: p.is_liked
                        ? Math.max(0, (p.likes_count || 0) - 1)
                        : (p.likes_count || 0) + 1,
                    } : null);
                  } catch {}
                }}
                onSave={async () => {
                  try {
                    if (selectedPost.is_saved) await apiService.unsavePost(String(selectedPost.id));
                    else await apiService.savePost(String(selectedPost.id));
                    setSelectedPost(p => p ? { ...p, is_saved: !p.is_saved } : null);
                  } catch {}
                }}
                onUserPress={(uid) => {
                  setSelectedPost(null);
                  onUserPress?.(uid);
                }}
                onLocationPress={(rid) => navigation?.navigate('RestaurantDetail', { restaurantId: rid })}
              />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Avatar fullscreen viewer */}
      <Modal visible={showAvatar} transparent animationType="fade" onRequestClose={() => setShowAvatar(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1} onPress={() => setShowAvatar(false)}>
          <Image source={{ uri: user?.avatar_url || '' }}
            style={{ width: W * 0.88, height: W * 0.88, borderRadius: W * 0.44 } as ImageStyle}
            resizeMode="cover" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17, marginTop: 18 }}>{user?.username}</Text>
          <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>Nhấn bất cứ đâu để đóng</Text>
        </TouchableOpacity>
      </Modal>

      {/* Social list */}
      <SocialModal
        visible={!!socialKind} kind={socialKind}
        targetId={String(user?.id || resolvedId || '')}
        myId={String(storeUser?.id || '')}
        onClose={() => setSocialKind(null)}
        onUserPress={id => {
          setSocialKind(null);
          onUserPress?.(id);
          navigation?.navigate('UserProfile', { userId: id });
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.white },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  nav:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  navBtn:        { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle:      { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 16, color: C.dark },
  skelBox:       { height: 240, alignItems: 'center', justifyContent: 'center' },
  topRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 },
  avatarWrap:    { position: 'relative', marginRight: 20 },
  avatar:        { width: 86, height: 86, borderRadius: 43, backgroundColor: C.border },
  avatarFallback:{ backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 32 },
  statsRow:      { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statBox:       { alignItems: 'center' },
  statNum:       { fontWeight: '800', fontSize: 18, color: C.dark },
  statLbl:       { color: C.mid, fontSize: 12, marginTop: 2 },
  bioWrap:       { paddingHorizontal: 16, paddingBottom: 14 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  username:      { fontWeight: '700', fontSize: 16, color: C.dark },
  fullName:      { fontSize: 14, color: C.mid, marginTop: 2 },
  ptsBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  ptsTxt:        { fontSize: 11, fontWeight: '700', color: C.primary },
  bio:           { fontSize: 14, color: C.dark, marginTop: 6, lineHeight: 20 },
  bioHint:       { fontSize: 13, color: C.primary, marginTop: 6, fontStyle: 'italic' },
  contribRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  contribTxt:    { fontSize: 12, color: C.primary, fontWeight: '600' },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge:         { backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FFD5C4' },
  badgeTxt:      { fontSize: 11, color: C.primary, fontWeight: '600' },
  btnRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  followBtn:     { flex: 1, backgroundColor: C.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  followingBtn:  { backgroundColor: C.border },
  followTxt:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  followingTxt:  { color: C.dark },
  msgBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 0.6, borderWidth: 1.5, borderColor: C.border, paddingVertical: 10, borderRadius: 10, justifyContent: 'center' },
  msgTxt:        { fontWeight: '600', fontSize: 14, color: C.dark },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border, paddingVertical: 10, borderRadius: 10 },
  editTxt:       { fontWeight: '600', fontSize: 14, color: C.dark },
  settBtn:       { width: 42, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  tabBar:        { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 12, borderTopWidth: 2, borderTopColor: 'transparent' },
  tabActive:     { borderTopColor: C.primary },
  gridCell:      { width: GRID, height: GRID, marginBottom: 1.5 },
  gridGap:       { marginRight: 1.5 },
  gridImg:       { width: '100%', height: '100%', backgroundColor: C.border },
  gridEmpty:     { width: '100%', height: '100%', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  gridBadge:     { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridBadgeTxt:  { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  emptyBox:      { alignItems: 'center', paddingVertical: 60 },
  emptyTxt:      { marginTop: 12, color: C.light, fontSize: 14 },
  resCard:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  resThumb:      { width: 64, height: 64, borderRadius: 10, backgroundColor: C.border },
  resThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  resBody:       { flex: 1, marginLeft: 12, marginRight: 8 },
  resName:       { fontWeight: '700', fontSize: 15, color: C.dark },
  resAddr:       { fontSize: 12, color: C.mid, marginTop: 2 },
  resMeta:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  resTag:        { backgroundColor: C.soft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  resTagTxt:     { fontSize: 11, color: C.primary, fontWeight: '600' },
  resStar:       { fontSize: 12, fontWeight: '600', color: C.dark },
  sheet:         { flex: 1, backgroundColor: C.white },
  sheetHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle:    { flex: 1, fontSize: 17, fontWeight: '700', color: C.dark, textAlign: 'center' },
  headBtn:       { width: 60 },
  headCancel:    { fontSize: 16, color: C.mid },
  headSave:      { fontSize: 16, color: C.primary, fontWeight: '700', textAlign: 'right' },
  editAvatarRow: { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  avatarTapWrap: { position: 'relative' },
  editAvatar:    { width: 96, height: 96, borderRadius: 48, backgroundColor: C.border },
  cameraBadge:   { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.white },
  changeAvatarTxt: { fontSize: 14, color: C.primary, fontWeight: '600' },
  editBody:      { paddingHorizontal: 16, paddingTop: 8 },
  errBox:        { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errTxt:        { color: C.red, fontSize: 14 },
  lbl:           { fontSize: 12, fontWeight: '600', color: C.mid, marginBottom: 6, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  field:         { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  fieldTall:     { height: 100, textAlignVertical: 'top' },
  charCount:     { fontSize: 12, color: C.light, textAlign: 'right', marginTop: 4 },
  settingsSheet: { flex: 1, backgroundColor: C.bg },
  groupLabel:    { fontSize: 11, fontWeight: '700', color: C.light, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  settGroup:     { backgroundColor: C.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  settRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  settIcon:      { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settLabel:     { flex: 1, fontSize: 15, color: C.dark },
  accountCard:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  accAvatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: C.border },
  accName:       { fontWeight: '700', fontSize: 16, color: C.dark },
  accSub:        { fontSize: 13, color: C.mid, marginTop: 2 },
  adminPill:     { backgroundColor: '#FF8C4218', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  adminPillTxt:  { color: '#FF8C42', fontSize: 12, fontWeight: '700' },
  socialRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  socialAvatar:  { width: 48, height: 48, borderRadius: 24, backgroundColor: C.border },
  socialName:    { fontWeight: '700', fontSize: 15, color: C.dark },
  socialSub:     { fontSize: 13, color: C.mid, marginTop: 1 },
  socialCount:   { fontSize: 12, color: C.light },
  socialFollowBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.primary, minWidth: 82, alignItems: 'center' },
  socialFollowBtnActive: { backgroundColor: C.border, borderWidth: 1, borderColor: C.border },
  socialFollowTxt:       { color: '#fff', fontWeight: '700', fontSize: 12 },
  socialFollowTxtActive: { color: C.dark },
  mapBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  multiImgBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: 3 },
});