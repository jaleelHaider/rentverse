import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const helpArticles: any = {
  'how-it-works': {
    title: 'How RentVerse Works',
    sections: [
      {
        subtitle: 'For Buyers',
        content: [
          '1. Browse: Explore thousands of listings in your area',
          '2. Compare: Check prices, condition, and seller ratings',
          '3. Order: Place a buy or rental order',
          '4. Confirm: Complete the transaction safely with our escrow system',
          '5. Enjoy: Use the item and rate your experience',
        ],
      },
      {
        subtitle: 'For Sellers',
        content: [
          '1. List: Create a detailed listing with photos and description',
          '2. Verify: Complete KYC to build trust with buyers',
          '3. Manage: Track orders and approve/reject requests',
          '4. Deliver: Arrange pickup or delivery with the buyer',
          '5. Earn: Get paid when the buyer confirms receipt',
        ],
      },
    ],
  },
  safety: {
    title: 'Safety & Trust',
    sections: [
      {
        subtitle: 'Verified Users',
        content: [
          '• All users are verified through KYC process',
          '• User profiles show ratings and reviews',
          '• Report suspicious users to our support team',
        ],
      },
      {
        subtitle: 'Secure Transactions',
        content: [
          '• Money stays in escrow until buyer confirms',
          '• Messages are encrypted between users',
          '• No sharing of personal phone numbers until deal confirmed',
        ],
      },
      {
        subtitle: 'Item Condition',
        content: [
          '• Honest item descriptions required from sellers',
          '• Multiple photos must be provided',
          '• Buyers can inspect before confirming receipt',
          '• Dispute resolution if item doesn\'t match description',
        ],
      },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    sections: [
      {
        subtitle: 'General Questions',
        content: [
          'Q: Is RentVerse free to use?\nA: Browsing is free. Small commission on completed transactions.',
          'Q: How do I contact a seller?\nA: Through secure messaging after placing an order.',
          'Q: Can I negotiate prices?\nA: Yes, message the seller to discuss prices.',
        ],
      },
      {
        subtitle: 'Rental Questions',
        content: [
          'Q: What if I damage a rental item?\nA: Discuss with seller for fair resolution. Security deposit covers damage.',
          'Q: Can I extend a rental?\nA: Yes, contact seller before end date.',
          'Q: Do rentals include delivery?\nA: Depends on seller. Check listing details.',
        ],
      },
    ],
  },
};

export default function HelpArticleScreen() {
  const router = useRouter();
  const { articleId } = useLocalSearchParams();
  const article = helpArticles[articleId as string];

  if (!article) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.pageTitle}>Article Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Could not load this article</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.pageTitle} numberOfLines={1}>
          {article.title}
        </Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {article.sections.map((section: any, idx: number) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.subtitle}>{section.subtitle}</Text>
            {section.content.map((line: string, lineIdx: number) => (
              <Text key={lineIdx} style={styles.contentText}>
                {line}
              </Text>
            ))}
          </View>
        ))}

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Still need help?</Text>
          <Text style={styles.footerText}>
            Our support team is here to assist you
          </Text>
          <Pressable style={styles.supportButton}>
            <MaterialIcons name="mail" size={18} color="#fff" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
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
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
});
