import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../components/profile/ProfileView';

export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ProfileView userId={String(id || '')} mode="other" />;
}
