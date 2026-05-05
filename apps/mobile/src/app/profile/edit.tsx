import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCurrentAuthProfile, useUpdateCurrentProfile } from '../../hooks/useProfile';

export default function EditProfileScreen() {
  const router = useRouter();
  const profileQuery = useCurrentAuthProfile();
  const updateProfile = useUpdateCurrentProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    const metadata = profileQuery.data?.user.user_metadata || {};
    setName(profile?.name || String(metadata.full_name || ''));
    setPhone(profile?.phone || '');
    setCity(profile?.city || '');
    setDescription(String(metadata.description || ''));
  }, [profileQuery.data]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, phone, city, description });
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
    } catch (error) {
      Alert.alert('Unable to save', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit profile</Text>
      <Text style={styles.subtitle}>Update the details sellers and buyers see.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#94a3b8" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#94a3b8" />

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Tell people about yourself" placeholderTextColor="#94a3b8" multiline numberOfLines={5} textAlignVertical="top" />

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={updateProfile.isPending}>
          <Text style={styles.saveText}>{updateProfile.isPending ? 'Saving...' : 'Save changes'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#64748b', marginTop: 8, marginBottom: 18 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { color: '#0f172a', fontWeight: '800', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  textArea: { minHeight: 130 },
  saveButton: { marginTop: 20, backgroundColor: '#0f172a', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
});
