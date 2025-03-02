'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Transcription {
  text: string;
  created_at: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [savedTranscriptions, setSavedTranscriptions] = useState<Transcription[]>([]);

  // Initialize Web Speech API
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new window.SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      setRecognition(recognitionInstance);
    }
  }, []);

  const startRecording = async () => {
    if (typeof window !== 'undefined' && window.SpeechRecognition) {
      try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const recognition = new window.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
    
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
    
          setTranscription(transcript);
        };
    
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            alert('Microphone access is required for speech recognition. Please allow microphone access and try again.');
          }
          setIsRecording(false);
        };
    
        recognition.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please ensure microphone permissions are granted and try again.');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    if (recognition) {
      recognition.stop();
    }

    if (!transcription.trim()) {
      setIsRecording(false);
      return;
    }

    try {
      // First verify the connection
      const { error: connectionError } = await supabase.from('transcriptions').select('count');
      if (connectionError) {
        console.error('Supabase connection error:', connectionError.message || 'Unknown error');
        alert('Failed to connect to the database. Please check your connection and try again.');
        setIsRecording(false);
        return;
      }

      const { error } = await supabase
        .from('transcriptions')
        .insert([{
          text: transcription,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error saving transcription:', error.message || 'Unknown error', '\nDetails:', error);
        alert('Failed to save transcription. Please try again.');
      } else {
        loadSavedTranscriptions();
      }
    } catch (e) {
      console.error('Unexpected error in stopRecording:', e);
      alert('An unexpected error occurred. Please try again.');
    }

    setIsRecording(false);
    setTranscription('');
  };

  // Initialize Supabase client
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ));

  // Load saved transcriptions on component mount
  useEffect(() => {
    if (supabase) {
      loadSavedTranscriptions();
    }
  }, [supabase]);

  const loadSavedTranscriptions = async () => {
    try {
      // First verify the connection
      const { error: connectionError } = await supabase.from('transcriptions').select('count');
      if (connectionError) {
        console.error('Supabase connection error:', connectionError.message || 'Unknown error', '\nDetails:', connectionError);
        return;
      }

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transcriptions:', error.message, '\nDetails:', error);
      } else {
        setSavedTranscriptions(data || []);
      }
    } catch (e) {
      console.error('Unexpected error in loadSavedTranscriptions:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Audio to Text Converter</h1>
          
          <div className="space-y-6">
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-6 py-3 rounded-full text-white font-medium ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Current Transcription</h2>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] whitespace-pre-wrap">
                {transcription || 'Start speaking to see transcription here...'}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Saved Transcriptions</h2>
              <div className="space-y-4">
                {savedTranscriptions.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{item.text}</p>
                    <p className="text-sm text-gray-500 mt-2">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
