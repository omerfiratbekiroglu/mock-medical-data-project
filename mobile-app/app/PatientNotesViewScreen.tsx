import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';
import { Ionicons } from '@expo/vector-icons';
import NavigationBar from '../components/NavigationBar';
import PatientDrawerPanel from '../components/PatientDrawerPanel';
import DiscussionModal from '../components/DiscussionModal';

interface PatientNote {
  note_id: number;
  title: string;
  content: string;
  care_level: number;
  caregiver_name: string;
  caregiver_id: number;
  created_at: string;
  updated_at: string;
}

interface PatientInfo {
  patient_id: number;
  patient_name: string;
  patient_email: string;
}

interface PatientWithNotes {
  patient_info: PatientInfo;
  notes: PatientNote[];
}

interface DoctorFeedback {
  id: number;
  content: string;
  created_at: string;
  doctor_name: string;
}

export default function PatientNotesViewScreen() {
  const router = useRouter();
  const { patientId, patientName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackList, setFeedbackList] = useState<{[key: number]: DoctorFeedback[]}>({});
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [discussionModalVisible, setDiscussionModalVisible] = useState(false);
  const [selectedDiscussionNoteId, setSelectedDiscussionNoteId] = useState<number | null>(null);
  const [selectedDiscussionNoteTitle, setSelectedDiscussionNoteTitle] = useState<string>('');

  useEffect(() => {
    loadPatientNotes();
  }, [patientId]);

  useEffect(() => {
    if (patientNotes.length > 0) {
      loadAllFeedback();
    }
  }, [patientNotes]);

  const loadPatientNotes = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');

      if (role !== 'doctor') {
        Alert.alert('Access Denied', 'Only doctors can view patient notes.');
        router.back();
        return;
      }

      const res = await fetch(`${API_BASE_URL}/doctor/my_patients_notes?user_id=${userId}&role=${role}&limit=100`);
      const data = await res.json();

      if (res.ok) {
        // Find notes for the specific patient
        const targetPatientKey = Object.keys(data.patients_with_notes).find(key => 
          key.includes(`(ID: ${patientId})`)
        );

        if (targetPatientKey) {
          const patientData = data.patients_with_notes[targetPatientKey];
          setPatientInfo(patientData.patient_info);
          setPatientNotes(patientData.notes);
        } else {
          setPatientNotes([]);
          setPatientInfo({
            patient_id: parseInt(patientId as string),
            patient_name: patientName as string,
            patient_email: ''
          });
        }
      } else {
        Alert.alert('Error', data.detail || 'Failed to load patient notes.');
      }
    } catch (error) {
      console.error('Load notes error:', error);
      Alert.alert('Error', 'Something went wrong while loading notes.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getCareLevel = (level: number) => {
    const levels = {
      1: { text: 'Low Care', color: '#27ae60' },
      2: { text: 'Minimal Care', color: '#2980b9' },
      3: { text: 'Moderate Care', color: '#f39c12' },
      4: { text: 'High Care', color: '#e74c3c' },
      5: { text: 'Critical Care', color: '#8e44ad' }
    };
    return levels[level as keyof typeof levels] || { text: 'Unknown', color: '#95a5a6' };
  };

  const loadAllFeedback = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      for (const note of patientNotes) {
        const res = await fetch(`${API_BASE_URL}/doctor_feedback/${note.note_id}?user_id=${userId}&role=${role}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFeedbackList(prev => ({
              ...prev,
              [note.note_id]: data.feedback
            }));
          }
        }
      }
    } catch (error) {
      console.error('Load feedback error:', error);
    }
  };

  const openFeedbackModal = (noteId: number) => {
    setSelectedNoteId(noteId);
    setFeedbackContent('');
    setFeedbackModalVisible(true);
  };

  const openDiscussionModal = (noteId: number, noteTitle: string) => {
    setSelectedDiscussionNoteId(noteId);
    setSelectedDiscussionNoteTitle(noteTitle);
    setDiscussionModalVisible(true);
  };

  const saveFeedback = async () => {
    if (!feedbackContent.trim() || !selectedNoteId) {
      Alert.alert('Error', 'Please enter feedback content');
      return;
    }

    try {
      setSavingFeedback(true);
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');

      const res = await fetch(`${API_BASE_URL}/doctor_feedback?user_id=${userId}&role=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: selectedNoteId,
          content: feedbackContent.trim()
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        Alert.alert('Success', 'Feedback saved successfully');
        setFeedbackModalVisible(false);
        setFeedbackContent('');
        loadAllFeedback(); // Reload feedback
      } else {
        Alert.alert('Error', result.detail || 'Failed to save feedback');
      }
    } catch (error) {
      console.error('Save feedback error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2980b9" />
        <Text style={styles.loadingText}>Loading patient notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationBar onMenuPress={() => setDrawerVisible(true)} />
      <PatientDrawerPanel visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2980b9" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Patient Notes</Text>
          <Text style={styles.headerSubtitle}>
            {patientInfo?.patient_name || patientName}
          </Text>
        </View>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.notesContainer}>
        {patientNotes.length > 0 ? (
          patientNotes.map((note, index) => {
            const careLevel = getCareLevel(note.care_level);
            return (
              <View key={note.note_id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteTitle}>
                    <Text style={styles.noteTitleText}>{note.title}</Text>
                    <View style={[styles.careLevelBadge, { backgroundColor: careLevel.color }]}>
                      <Text style={styles.careLevelText}>{note.care_level}</Text>
                    </View>
                  </View>
                  <Text style={styles.caregiverName}>by {note.caregiver_name}</Text>
                </View>
                
                <Text style={styles.noteContent}>{note.content}</Text>
                
                <View style={styles.noteFooter}>
                  <Text style={styles.dateText}>Created: {formatDate(note.created_at)}</Text>
                  {note.created_at !== note.updated_at && (
                    <Text style={styles.dateText}>Updated: {formatDate(note.updated_at)}</Text>
                  )}
                </View>
                
                <View style={styles.careLevelFooter}>
                  <Text style={styles.careLevelLabel}>Care Level: </Text>
                  <Text style={[styles.careLevelValue, { color: careLevel.color }]}>
                    {careLevel.text}
                  </Text>
                </View>

                {/* Discussion Section */}
                <View style={styles.discussionSection}>
                  <TouchableOpacity 
                    style={styles.discussionButton}
                    onPress={() => openDiscussionModal(note.note_id, note.title)}
                  >
                    <Ionicons name="chatbubbles" size={18} color="#2980b9" />
                    <Text style={styles.discussionButtonText}>Open Discussion</Text>
                    <Ionicons name="chevron-forward" size={16} color="#7f8c8d" />
                  </TouchableOpacity>
                  
                  {feedbackList[note.note_id] && feedbackList[note.note_id].length > 0 && (
                    <View style={styles.discussionPreview}>
                      <Text style={styles.discussionPreviewTitle}>
                        {feedbackList[note.note_id].length} discussion message{feedbackList[note.note_id].length > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.discussionPreviewText}>
                        Latest: {feedbackList[note.note_id][feedbackList[note.note_id].length - 1].content.substring(0, 80)}...
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No notes found</Text>
            <Text style={styles.emptySubText}>
              This patient doesn't have any caregiver notes yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Notes: {patientNotes.length}
        </Text>
      </View>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Doctor Feedback</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setFeedbackModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Feedback Content:</Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              placeholder="Write your feedback for the caregiver..."
              value={feedbackContent}
              onChangeText={setFeedbackContent}
              textAlignVertical="top"
              numberOfLines={8}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, savingFeedback && { backgroundColor: '#ccc' }]}
                onPress={saveFeedback}
                disabled={savingFeedback}
              >
                <Text style={styles.saveButtonText}>
                  {savingFeedback ? 'Saving...' : 'Save Feedback'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discussion Modal */}
      <DiscussionModal
        visible={discussionModalVisible}
        onClose={() => setDiscussionModalVisible(false)}
        noteId={selectedDiscussionNoteId || 0}
        noteTitle={selectedDiscussionNoteTitle}
        patientName={patientInfo?.patient_name || patientName as string}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTextContainer: {
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
  notesContainer: {
    flex: 1,
    padding: 15,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  noteHeader: {
    marginBottom: 10,
  },
  noteTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  noteTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a3b4c',
    flex: 1,
    marginRight: 10,
  },
  careLevelBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careLevelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  caregiverName: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  noteContent: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 8,
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 2,
  },
  careLevelFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  careLevelLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  careLevelValue: {
    fontSize: 12,
    fontWeight: 'bold',
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
  summary: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  summaryText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // Discussion styles
  discussionSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  discussionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafb',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  discussionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#2980b9',
    fontWeight: '600',
  },
  discussionPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#95a5a6',
  },
  discussionPreviewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  discussionPreviewText: {
    fontSize: 13,
    color: '#5a6c7d',
    lineHeight: 18,
  },
  // Feedback Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f4f6fa',
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
  modalContent: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 10,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    minHeight: 150,
    maxHeight: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#2980b9',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});