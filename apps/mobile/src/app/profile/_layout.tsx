import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Profile',
        }}
      />
      <Stack.Screen
        name="my-listings"
        options={{
          title: 'My Listings',
        }}
      />
      <Stack.Screen
        name="my-bookings"
        options={{
          title: 'My Bookings',
        }}
      />
      <Stack.Screen
        name="reviews"
        options={{
          title: 'Reviews',
        }}
      />
      <Stack.Screen
        name="earnings"
        options={{
          title: 'Earnings',
        }}
      />
    </Stack>
  );
}
