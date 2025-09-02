import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config';
import ChatModal from '../../components/ChatModal';
import { Ionicons } from '@expo/vector-icons';


export default function PatientUpdateScreen() {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [careLevel, setCareLevel] = useState(3);
  const [saving, setSaving] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [doctorFeedback, setDoctorFeedback] = useState<any[]>([]);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatNoteId, setSelectedChatNoteId] = useState<number | null>(null);
  const [selectedChatNoteTitle, setSelectedChatNoteTitle] = useState<string>('');
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);


  const loadDoctorFeedback = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      if (role !== 'caregiver' || !userId) return;

      const response = await fetch(
        `${API_BASE_URL}/caregiver_feedback?caregiver_id=${userId}&role=${role}`
      );
      const result = await response.json();
      
      if (result.success) {
        setDoctorFeedback(result.feedback);
      }
    } catch (error) {
      console.log('Error loading doctor feedback:', error);
    }
  };

  const loadUnreadMessageCount = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      if (role !== 'caregiver' || !userId) return;

      const response = await fetch(
        `${API_BASE_URL}/chat/unread_count?user_id=${userId}&role=${role}`
      );
      const result = await response.json();
      
      if (result.success) {
        setUnreadMessageCount(result.unread_count);
      }
    } catch (error) {
      console.log('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    loadDoctorFeedback();
    loadUnreadMessageCount();
    // Poll for new feedback and messages every 30 seconds
    const interval = setInterval(() => {
      loadDoctorFeedback();
      loadUnreadMessageCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveComment = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const patientId = await AsyncStorage.getItem('selectedPatientId');
    const role = await AsyncStorage.getItem('role');

    // Validation
    if (!title.trim()) {
      Alert.alert('Empty Title', 'Please enter a note title.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Empty Content', 'Please enter note content.');
      return;
    }
    if (role !== 'caregiver') {
      Alert.alert('Access Denied', 'Only caregivers can add notes.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/caregiver_notes?caregiver_id=${userId}&role=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: parseInt(patientId || '0'),
          title: title.trim(),
          content: comment.trim(),
          care_level: careLevel
        }),
      });

      const result = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Note saved successfully.');
        setTitle('');
        setComment('');
        setCareLevel(3);
      } else {
        Alert.alert('Error', result.detail || 'Failed to save note.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const openChatModal = (noteId: number, noteTitle: string, patientName: string) => {
    setSelectedChatNoteId(noteId);
    setSelectedChatNoteTitle(noteTitle);
    setSelectedPatientName(patientName);
    setChatModalVisible(true);
  };

  const handleChatClose = () => {
    setChatModalVisible(false);
    // Reload unread count when chat closes
    loadUnreadMessageCount();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.header}>Caregiver Notes</Text>
          <Text style={styles.subtext}>Add observation notes for the selected patient.</Text>
        </View>
        
        {/* Feedback Button with Chat Notification */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.feedbackButton, doctorFeedback.length > 0 && styles.feedbackButtonActive]}
            onPress={() => setShowFeedbackModal(true)}
          >
            <Text style={[styles.feedbackButtonText, doctorFeedback.length > 0 && styles.feedbackButtonTextActive]}>
              💬 Notes {doctorFeedback.length > 0 && `(${doctorFeedback.length})`}
            </Text>
            {unreadMessageCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadMessageCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {unreadMessageCount > 0 && (
            <Text style={styles.unreadMessageHint}>
              {unreadMessageCount} new message{unreadMessageCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.label}>Note Title</Text>
      <TextInput
        style={styles.titleInput}
        placeholder="Enter note title..."
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Care Level (1-5)</Text>
      <View style={styles.careLevelContainer}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.careLevelButton,
              careLevel === level && styles.careLevelSelected
            ]}
            onPress={() => setCareLevel(level)}
          >
            <Text style={[
              styles.careLevelText,
              careLevel === level && styles.careLevelTextSelected
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Note Content</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Write your observation notes here..."
        value={comment}
        onChangeText={setComment}
        textAlignVertical="top"
        numberOfLines={6}
      />

      <TouchableOpacity
        style={[styles.button, saving && { backgroundColor: '#ccc' }]}
        onPress={handleSaveComment}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Note'}</Text>
      </TouchableOpacity>


      {/* Doctor Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Doctor Feedback</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.feedbackList}>
            {doctorFeedback.length === 0 ? (
              <Text style={styles.noFeedbackText}>No notes or feedback yet.</Text>
            ) : (
              doctorFeedback.map((item) => (
                <View key={item.feedback_id || `${item.item_type}-${item.note_id}`} style={styles.feedbackItem}>
                  <View style={styles.feedbackNoteInfo}>
                    <Text style={styles.feedbackNoteTitle}>{item.note_title}</Text>
                    <Text style={styles.feedbackPatient}>Patient: {item.patient_name}</Text>
                    <Text style={styles.feedbackDate}>
                      Note Date: {new Date(item.note_created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  
                  {item.item_type === 'doctor_feedback' ? (
                    <View style={styles.feedbackContent}>
                      {/* Orijinal bakıcı yorumunu göster */}
                      <View style={styles.originalCommentSection}>
                        <Text style={styles.originalCommentLabel}>Your Original Comment:</Text>
                        <Text style={styles.originalCommentText}>{item.note_content}</Text>
                      </View>
                      
                      {/* Doktor dönütü */}
                      <View style={styles.doctorFeedbackSection}>
                        <View style={styles.feedbackHeader}>
                          <Text style={styles.doctorName}>Dr. {item.doctor_name} replied:</Text>
                          <Text style={styles.feedbackDateTime}>
                            {new Date(item.feedback_created_at).toLocaleString('tr-TR')}
                          </Text>
                        </View>
                        <Text style={styles.feedbackText}>{item.feedback_content}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.caregiverNoteContent}>
                      <View style={styles.feedbackHeader}>
                        <Text style={styles.caregiverName}>Your Note</Text>
                        <Text style={styles.careLevelBadge}>Care Level: {item.care_level}</Text>
                      </View>
                      <Text style={styles.caregiverNoteText}>{item.note_content}</Text>
                    </View>
                  )}
                  
                  {/* Chat Button for each note */}
                  <TouchableOpacity 
                    style={styles.chatButton}
                    onPress={() => openChatModal(item.note_id, item.note_title, item.patient_name)}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#27ae60" />
                    <Text style={styles.chatButtonText}>Open Chat</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Chat Modal */}
      <ChatModal
        visible={chatModalVisible}
        onClose={handleChatClose}
        noteId={selectedChatNoteId || 0}
        noteTitle={selectedChatNoteTitle}
        patientName={selectedPatientName}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  headerTextContainer: {
    flexShrink: 1,
    marginRight: 15,
    maxWidth: '65%',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2a3b4c',
  },
  subtext: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
    color: '#2a3b4c',
  },
  titleInput: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  careLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  careLevelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  careLevelSelected: {
    borderColor: '#2980b9',
    backgroundColor: '#2980b9',
  },
  careLevelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  careLevelTextSelected: {
    color: '#fff',
  },
  input: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2980b9',
    padding: 15,
    marginTop: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a3b4c',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Feedback styles
  buttonContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  feedbackButton: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  feedbackButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  feedbackButtonTextActive: {
    color: '#fff',
  },
  feedbackList: {
    flex: 1,
  },
  noFeedbackText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
    fontStyle: 'italic',
  },
  feedbackItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackNoteInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  feedbackNoteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 4,
  },
  feedbackPatient: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  feedbackContent: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  originalCommentSection: {
    backgroundColor: '#e8f4f8',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2980b9',
  },
  originalCommentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2980b9',
    marginBottom: 6,
  },
  originalCommentText: {
    fontSize: 13,
    color: '#2a3b4c',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  doctorFeedbackSection: {
    backgroundColor: '#f0f8e8',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  feedbackDateTime: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  feedbackText: {
    fontSize: 14,
    color: '#2a3b4c',
    lineHeight: 20,
  },
  // Caregiver note styles
  caregiverNoteContent: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2980b9',
  },
  caregiverName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2980b9',
  },
  careLevelBadge: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  caregiverNoteText: {
    fontSize: 14,
    color: '#2a3b4c',
    lineHeight: 20,
    marginTop: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27ae60',
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  chatButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  unreadMessageHint: {
    fontSize: 11,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
});
