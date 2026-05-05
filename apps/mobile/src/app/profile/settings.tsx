import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useCurrentAuthProfile, useUpdateCurrentEmail, useUpdateCurrentProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { getPreferences, setPreferences } from '../../utils/preferencesStorage';
import { useEffect as useEffect2 } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const dimensions = useWindowDimensions();
  const profileQuery = useCurrentAuthProfile();
  const updateEmail = useUpdateCurrentEmail();
  const updateProfile = useUpdateCurrentProfile();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    bio: '',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ne'>('en');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showKycUpload, setShowKycUpload] = useState(false);
  const [kycDocumentType, setKycDocumentType] = useState<'national_id' | 'passport' | 'drivers_license'>('national_id');

  const profile = profileQuery.data?.user;

  useEffect2(() => {
    if (profile) {
      setFormData({
        fullName: String(profile.user_metadata?.full_name || ''),
        email: profile.email || '',
        phone: String(profile.user_metadata?.phone || ''),
        city: String(profile.user_metadata?.city || ''),
        bio: String(profile.user_metadata?.bio || ''),
      });
    }
  }, [profile]);

  useEffect2(() => {
    void (async () => {
      const preferences = await getPreferences();
      setNotificationsEnabled(preferences.notificationsEnabled);
      setDarkMode(preferences.darkMode);
      setLanguage(preferences.language);
    })();
  }, []);

  const persistPreferences = async (next: {
    notificationsEnabled: boolean;
    darkMode: boolean;
    language: 'en' | 'ne';
  }) => {
    await setPreferences(next);
  };

  const handleToggle = async (key: 'notificationsEnabled' | 'darkMode') => {
    const next = {
      notificationsEnabled: key === 'notificationsEnabled' ? !notificationsEnabled : notificationsEnabled,
      darkMode: key === 'darkMode' ? !darkMode : darkMode,
      language,
    };
    setNotificationsEnabled(next.notificationsEnabled);
    setDarkMode(next.darkMode);
    await persistPreferences(next);
  };

  const handleLanguage = async () => {
    const next = language === 'en' ? 'ne' : 'en';
    setLanguage(next);
    await persistPreferences({ notificationsEnabled, darkMode, language: next });
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile.mutateAsync({
        name: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        description: formData.bio,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    try {
      await updateEmail.mutateAsync(formData.email);
      Alert.alert('Success', 'Check your inbox for an email verification link');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update email');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Account Settings</Text>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="camera-alt" size={32} color="#64748b" />
              </View>
            )}
            <Pressable style={styles.avatarButton} onPress={handlePickAvatar}>
              <MaterialIcons name="camera-alt" size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.avatarHint}>Change profile picture</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="03001234567"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Your city"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio / Description</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell others about yourself..."
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            multiline
            numberOfLines={4}
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <Pressable
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleSaveProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          )}
        </Pressable>
      </View>

      {/* Email Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email & Verification</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#cbd5e1"
          />
        </View>

        <Pressable
          style={[styles.button, styles.outlineButton]}
          onPress={handleEmailUpdate}
          disabled={updateEmail.isPending}
        >
          <MaterialIcons name="mail" size={16} color="#3b82f6" />
          <Text style={styles.outlineButtonText}>
            {updateEmail.isPending ? 'Updating...' : 'Update Email'}
          </Text>
        </Pressable>

        {/* KYC Verification */}
        <Pressable
          style={styles.settingRow}
          onPress={() => setShowKycUpload(!showKycUpload)}
        >
          <View style={styles.settingRowContent}>
            <MaterialIcons name="security" size={20} color="#3b82f6" />
            <View>
              <Text style={styles.settingLabel}>KYC Verification</Text>
              <Text style={styles.settingHint}>Verify your identity</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
        </Pressable>

        {showKycUpload && (
          <View style={styles.kycUploadSection}>
            <Text style={styles.kycTitle}>KYC Verification</Text>
            <View style={styles.documentTypeSelector}>
              {(['national_id', 'passport', 'drivers_license'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.docTypeButton,
                    kycDocumentType === type && styles.docTypeButtonActive,
                  ]}
                  onPress={() => setKycDocumentType(type)}
                >
                  <Text
                    style={[
                      styles.docTypeButtonText,
                      kycDocumentType === type && styles.docTypeButtonTextActive,
                    ]}
                  >
                    {type === 'national_id' ? 'National ID' : type === 'passport' ? 'Passport' : "Driver's License"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.uploadArea}>
              <Pressable style={styles.uploadButton}>
                <MaterialIcons name="file-upload" size={24} color="#3b82f6" />
                <Text style={styles.uploadButtonText}>Upload Front Side</Text>
              </Pressable>
              <Pressable style={styles.uploadButton}>
                <MaterialIcons name="file-upload" size={24} color="#3b82f6" />
                <Text style={styles.uploadButtonText}>Upload Back Side</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Submit Verification</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={() => handleToggle('notificationsEnabled')}
            trackColor={{ false: '#cbd5e1', true: '#86efac' }}
            thumbColor={notificationsEnabled ? '#3b82f6' : '#cbd5e1'}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={() => handleToggle('darkMode')}
            trackColor={{ false: '#cbd5e1', true: '#86efac' }}
            thumbColor={darkMode ? '#3b82f6' : '#cbd5e1'}
          />
        </View>

        <Pressable style={styles.settingRow} onPress={handleLanguage}>
          <Text style={styles.settingLabel}>Language</Text>
          <Text style={styles.settingValue}>{language === 'en' ? 'English' : 'Nepali'}</Text>
        </Pressable>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Pressable style={[styles.button, styles.dangerButton]} onPress={logout}>
          <MaterialIcons name="logout" size={16} color="#fff" />
          <Text style={styles.dangerButtonText}>Logout</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.deleteButton]} onPress={() => Alert.alert('Delete Account', 'Are you sure?')}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 12,
    color: '#64748b',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 12,
  },
  outlineButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  settingRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  settingHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#64748b',
  },
  kycUploadSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  documentTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  docTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  docTypeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  docTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  docTypeButtonTextActive: {
    color: '#fff',
  },
  uploadArea: {
    gap: 8,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
