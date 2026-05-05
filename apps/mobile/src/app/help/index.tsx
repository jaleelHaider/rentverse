import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const helpItems = [
  {
    id: 'how-it-works',
    icon: 'help-outline',
    title: 'How RentVerse Works',
    description: 'Learn how to buy, rent, and sell on RentVerse',
  },
  {
    id: 'safety',
    icon: 'shield',
    title: 'Safety & Trust',
    description: 'Our commitment to keeping you safe',
  },
  {
    id: 'faq',
    icon: 'question-answer',
    title: 'Frequently Asked Questions',
    description: 'Answers to common questions',
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    title: 'Contact Support',
    description: 'Get in touch with our support team',
  },
  {
    id: 'terms',
    icon: 'description',
    title: 'Terms of Service',
    description: 'Read our terms and conditions',
  },
  {
    id: 'privacy',
    icon: 'privacy-tip',
    title: 'Privacy Policy',
    description: 'How we protect your data',
  },
];

export default function HelpScreen() {
  const router = useRouter();

const handleItemPress = (id: string) => {
    router.push({pathname:'/help/[articleId]', params:{articleId:id}} as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.pageTitle}>Help & Support</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Message */}
        <View style={styles.welcomeCard}>
          <MaterialIcons name="info" size={28} color="#1d4ed8" />
          <Text style={styles.welcomeTitle}>Welcome to RentVerse Support</Text>
          <Text style={styles.welcomeText}>
            Find answers to your questions and learn how to make the most of RentVerse.
          </Text>
        </View>

        {/* Help Items */}
        {helpItems.map((item) => (
          <Pressable
            key={item.id}
            style={styles.helpItem}
            onPress={() => handleItemPress(item.id)}
          >
            <View style={styles.itemIcon}>
              <MaterialIcons name={item.icon as any} size={24} color="#1d4ed8" />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>

            <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
          </Pressable>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Can't find what you're looking for?</Text>
          <Pressable style={styles.contactButton} onPress={() => handleItemPress('contact')}>
            <MaterialIcons name="mail" size={18} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
    marginTop: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  helpItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  footer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
