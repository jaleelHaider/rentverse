import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Image, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

// Mock messages data - in real app, fetch from backend
const mockMessages = [
  {
    id: 'msg1',
    senderId: 'user123',
    text: 'Hi, is this still available?',
    timestamp: '10:30 AM',
    isRead: true,
  },
  {
    id: 'msg2',
    senderId: 'currentUser',
    text: 'Yes, it\'s still available! Great condition.',
    timestamp: '10:32 AM',
    isRead: true,
  },
  {
    id: 'msg3',
    senderId: 'user123',
    text: 'What\'s the lowest price?',
    timestamp: '10:35 AM',
    isRead: true,
  },
  {
    id: 'msg4',
    senderId: 'currentUser',
    text: 'I can do 1000 PKR for quick sale',
    timestamp: '10:36 AM',
    isRead: true,
  },
  {
    id: 'msg5',
    senderId: 'user123',
    text: 'Sounds good! When can I view it?',
    timestamp: '10:38 AM',
    isRead: false,
  },
];

const otherUser = {
  id: 'user123',
  name: 'Ahmed Hassan',
  avatar: null,
};

export default function ChatScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(mockMessages);

  const sendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage = {
      id: `msg${messages.length + 1}`,
      senderId: 'currentUser',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  const renderMessage = ({ item }: any) => {
    const isOwn = item.senderId === 'currentUser';

    return (
      <View style={[styles.messageRow, isOwn && styles.ownMessageRow]}>
        {!isOwn && (
          <View style={styles.messageAvatar}>
            <MaterialIcons name="person" size={20} color="#fff" />
          </View>
        )}

        <View style={[styles.messageBubble, isOwn && styles.ownBubble]}>
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {item.timestamp}
          </Text>
        </View>

        {isOwn && item.isRead && (
          <MaterialIcons name="done-all" size={16} color="#1d4ed8" style={styles.readIcon} />
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser.name}</Text>
          <Text style={styles.headerStatus}>Active now</Text>
        </View>

        <Pressable style={styles.headerButton}>
          <MaterialIcons name="info-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        scrollEnabled
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBox}>
          <Pressable>
            <MaterialIcons name="add" size={24} color="#1d4ed8" />
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#cbd5e1"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />

          <Pressable onPress={sendMessage} disabled={!messageText.trim()}>
            <MaterialIcons
              name="send"
              size={20}
              color={messageText.trim() ? '#1d4ed8' : '#cbd5e1'}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ownBubble: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  messageText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#cbd5e1',
  },
  readIcon: {
    marginLeft: 4,
    marginBottom: 4,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
  },
});
