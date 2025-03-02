'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Transcription {
  id: number;
  text: string;
  created_at: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [savedTranscriptions, setSavedTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Initialize speech recognition on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const instance = new SpeechRecognition();
        instance.continuous = true;
        instance.interimResults = true;
        setRecognition(instance);

        return () => {
          if (instance) {
            try {
              instance.stop();
            } catch (e) {
              // Ignore errors when stopping
            }
          }
        };
      }
    }
  }, []);

  const startRecording = async () => {
    if (recognition) {
      try {
        setIsLoading(true);
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
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
          setIsLoading(false);
        };
    
        recognition.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please ensure microphone permissions are granted and try again.');
        setIsRecording(false);
      } finally {
        setIsLoading(false);
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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
      setIsRecording(false);
      setTranscription('');
    }
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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTranscription = async (id: number) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', id);
  
      if (error) {
        console.error('Error deleting transcription:', error.message);
        alert('Failed to delete transcription. Please try again.');
      } else {
        loadSavedTranscriptions();
      }
    } catch (e) {
      console.error('Unexpected error in deleteTranscription:', e);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg sm:rounded-xl p-8 transition-all duration-300 hover:shadow-xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Audio to Text Converter</h1>
          
          <div className="space-y-8">
            <div className="flex justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`
                  px-8 py-4 rounded-full text-white font-medium text-lg
                  transform transition-all duration-300 ease-in-out
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                  ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isRecording ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
                `}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  isRecording ? 'Stop Recording' : 'Start Recording'
                )}
              </button>
            </div>

            <div className="mt-6 transform transition-all duration-300">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Current Transcription</h2>
              <div className={`
                bg-gray-50 rounded-lg p-6 min-h-[120px] whitespace-pre-wrap
                border-2 transition-all duration-300
                ${transcription ? 'border-blue-200' : 'border-transparent'}
                ${isRecording ? 'animate-pulse' : ''}
              `}>
                <p className={`text-lg ${transcription ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                  {transcription || 'Start speaking to see transcription here...'}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Saved Transcriptions</h2>
              <div className="space-y-4">
                {savedTranscriptions.map((item) => (
                  <div
                    key={item.id}
                    className="
                      bg-gray-50 rounded-lg p-6 relative
                      transform transition-all duration-300
                      hover:shadow-md hover:bg-gray-100
                    "
                  >
                    {showDeleteConfirm === item.id ? (
                      <div className="absolute top-4 right-4 flex items-center space-x-2">
                        <button
                          onClick={() => deleteTranscription(item.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-gray-500 hover:text-gray-600 font-medium text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(item.id)}
                        className="
                          absolute top-4 right-4
                          text-gray-400 hover:text-red-600
                          transition-colors duration-300
                        "
                        aria-label="Delete transcription"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <p className="text-gray-800 text-lg pr-12">{item.text}</p>
                    <p className="text-sm text-gray-500 mt-3">{new Date(item.created_at).toLocaleString()}</p>
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
