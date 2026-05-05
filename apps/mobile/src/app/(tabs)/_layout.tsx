import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import HomeScreen from './index';
import SearchScreen from './search';
import CreateScreen from './create';
import MessagesScreen from './messages';
import ProfileScreen from './profile';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

const tabScreenOptions = (routeName: string): BottomTabNavigationOptions => {
  let icon: string;
  
  switch (routeName) {
    case 'index':
      icon = 'home';
      break;
    case 'search':
      icon = 'search';
      break;
    case 'create':
      icon = 'add-circle';
      break;
    case 'messages':
      icon = 'mail';
      break;
    case 'profile':
      icon = 'person';
      break;
    default:
      icon = 'home';
  }

  return {
    headerShown: false,
    tabBarIcon: ({ color, size }) => (
      <MaterialIcons name={icon as any} size={size} color={color} />
    ),
    tabBarActiveTintColor: '#3b82f6',
    tabBarInactiveTintColor: '#94a3b8',
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopColor: '#e2e8f0',
      borderTopWidth: 1,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 2,
    },
  };
};

export default function TabLayout() {
  return (
    <Tab.Navigator
      id="root-tabs"
      screenOptions={({ route }) => tabScreenOptions(route.name as string)}
    >
      <Tab.Screen
        name="index"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="search"
        component={SearchScreen}
        options={{
          title: 'Search',
        }}
      />
      <Tab.Screen
        name="create"
        component={CreateScreen}
        options={{
          title: 'Create',
        }}
      />
      <Tab.Screen
        name="messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
