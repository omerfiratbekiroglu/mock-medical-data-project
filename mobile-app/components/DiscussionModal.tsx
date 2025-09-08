import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

interface DiscussionItem {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender_role: string;
  sender_name: string;
  message_type: 'feedback' | 'message';
  is_read: boolean;
}

interface DiscussionModalProps {
  visible: boolean;
  onClose: () => void;
  noteId: number;
  noteTitle: string;
  patientName: string;
}

export default function DiscussionModal({ 
  visible, 
  onClose, 
  noteId, 
  noteTitle, 
  patientName 
}: DiscussionModalProps) {
  const [discussion, setDiscussion] = useState<DiscussionItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<'feedback' | 'message'>('message');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadUserInfo();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && noteId && currentUserId && currentUserRole) {
      loadDiscussion();
    }
  }, [visible, noteId, currentUserId, currentUserRole]);

  useEffect(() => {
    if (discussion.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [discussion]);

  const loadUserInfo = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      setCurrentUserId(userId ? parseInt(userId) : null);
      setCurrentUserRole(role);
    } catch (error) {
      console.error('Load user info error:', error);
    }
  };

  const loadDiscussion = async () => {
    if (!currentUserId || !currentUserRole) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/note_discussion/${noteId}?user_id=${currentUserId}&role=${currentUserRole}`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setDiscussion(data.discussion);
      } else {
        Alert.alert('Error', data.detail || 'Failed to load discussion');
      }
    } catch (error) {
      console.error('Load discussion error:', error);
      Alert.alert('Error', 'Something went wrong while loading discussion');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !currentUserRole) {
      return;
    }

    try {
      setSending(true);
      
      const endpoint = messageMode === 'feedback' 
        ? `${API_BASE_URL}/doctor_feedback?user_id=${currentUserId}&role=${currentUserRole}`
        : `${API_BASE_URL}/chat/send?user_id=${currentUserId}&role=${currentUserRole}`;
      
      const body = messageMode === 'feedback'
        ? { note_id: noteId, content: newMessage.trim() }
        : { note_id: noteId, content: newMessage.trim() };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNewMessage('');
        loadDiscussion();
      } else {
        Alert.alert('Error', result.detail || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Something went wrong while sending message');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const renderDiscussionItem = (item: DiscussionItem, index: number) => {
    const isMyMessage = item.sender_id === currentUserId;
    const showProfile = index === 0 || discussion[index - 1]?.sender_id !== item.sender_id;
    const isFeedback = item.message_type === 'feedback';

    return (
      <View key={`${item.message_type}-${item.id}`} style={styles.discussionItemContainer}>
        {showProfile && (
          <View style={styles.profileSection}>
            <View style={[
              styles.profileAvatar, 
              { backgroundColor: item.sender_role === 'doctor' ? '#e74c3c' : '#27ae60' }
            ]}>
              <Ionicons 
                name={item.sender_role === 'doctor' ? 'medical' : 'person'} 
                size={16} 
                color="#fff" 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.senderName}>
                {item.sender_name}
              </Text>
              <Text style={styles.senderRole}>
                {item.sender_role === 'doctor' ? 'Doctor' : 'Caregiver'}
              </Text>
            </View>
            <Text style={styles.messageTime}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          showProfile ? {} : { marginLeft: 40 }
        ]}>
          <View style={[
            styles.messageContent,
            isFeedback && styles.feedbackContent
          ]}>
            {isFeedback && (
              <View style={styles.feedbackBadge}>
                <Ionicons name="document-text" size={12} color="#2980b9" />
                <Text style={styles.feedbackBadgeText}>Official Feedback</Text>
              </View>
            )}
            <Text style={[
              styles.messageText,
              isFeedback && styles.feedbackText
            ]}>
              {item.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Discussion</Text>
            <Text style={styles.headerSubtitle}>{noteTitle}</Text>
            <Text style={styles.headerPatient}>Patient: {patientName}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#2980b9" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.discussionContainer}
          contentContainerStyle={styles.discussionContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2980b9" />
              <Text style={styles.loadingText}>Loading discussion...</Text>
            </View>
          ) : discussion.length > 0 ? (
            discussion.map((item, index) => renderDiscussionItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyText}>No discussion yet</Text>
              <Text style={styles.emptySubText}>Start a professional discussion about this note</Text>
            </View>
          )}
        </ScrollView>

        {currentUserRole === 'doctor' && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                messageMode === 'message' && styles.activeModeButton
              ]}
              onPress={() => setMessageMode('message')}
            >
              <Text style={[
                styles.modeButtonText,
                messageMode === 'message' && styles.activeModeButtonText
              ]}>
                Quick Reply
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                messageMode === 'feedback' && styles.activeModeButton
              ]}
              onPress={() => setMessageMode('feedback')}
            >
              <Text style={[
                styles.modeButtonText,
                messageMode === 'feedback' && styles.activeModeButtonText
              ]}>
                Official Feedback
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder={
              messageMode === 'feedback' 
                ? "Write official feedback for the caregiver..." 
                : "Type your message..."
            }
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              messageMode === 'feedback' && styles.feedbackSendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons 
                name={messageMode === 'feedback' ? 'document-text' : 'send'} 
                size={20} 
                color="#fff" 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a3b4c',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  headerPatient: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  discussionContainer: {
    flex: 1,
  },
  discussionContent: {
    padding: 15,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 40,
  },
  discussionItemContainer: {
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2a3b4c',
  },
  senderRole: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  messageTime: {
    fontSize: 11,
    color: '#95a5a6',
  },
  messageContainer: {
    paddingLeft: 4,
  },
  messageContent: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackContent: {
    borderLeftColor: '#2980b9',
    backgroundColor: '#f8fafb',
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e3f2fd',
  },
  feedbackBadgeText: {
    fontSize: 12,
    color: '#2980b9',
    fontWeight: '600',
    marginLeft: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#34495e',
  },
  feedbackText: {
    color: '#2a3b4c',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: '#2980b9',
    borderColor: '#2980b9',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeModeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackSendButton: {
    backgroundColor: '#2980b9',
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
});