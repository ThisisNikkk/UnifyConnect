'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import { useParams } from 'next/navigation';
import { Loader } from 'lucide-react';

import { useGetCallById } from '@/hooks/useGetCallById';
import Alert from '@/components/Alert';
import MeetingSetup from '@/components/MeetingSetup';
import MeetingRoom from '@/components/MeetingRoom';

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

const MeetingPage = () => {
  const { id } = useParams();
  const { isLoaded, user } = useUser();
  const { call, isCallLoading } = useGetCallById(id);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isCaptioning, setIsCaptioning] = useState(false);

  useEffect(() => {
    if (!isSetupComplete || !isCaptioning) return;

    let recognition: SpeechRecognition | null = null;

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognitionConstructor();
      
      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.start();
      }
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isSetupComplete, isCaptioning]);

  if (!isLoaded || isCallLoading) return <Loader />;

  if (!call) return (
    <p className="text-center text-3xl font-bold text-white">
      Call Not Found
    </p>
  );

  // get more info about custom call type:  https://getstream.io/video/docs/react/guides/configuring-call-types/
  const notAllowed = call.type === 'invited' && (!user || !call.state.members.find((m) => m.user.id === user.id));

  if (notAllowed) return <Alert title="You are not allowed to join this meeting" />;

  return (
    <main className="h-screen w-full">
      <StreamCall call={call}>
        <StreamTheme>
        {!isSetupComplete ? (
          <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
        ) : (
          <>
            <MeetingRoom />
            <button 
              onClick={() => setIsCaptioning(!isCaptioning)}
              className="absolute bottom-20 right-4 z-20 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              {isCaptioning ? 'Stop Captions' : 'Start Captions'}
            </button>
            {isCaptioning && (
              <div className="absolute top-3/4 left-1/2 transform -translate-x-1/2 max-w-[1000px] bg-black/50 p-4 text-white text-center z-10 rounded-lg">
                {transcript}
              </div>
            )}
          </>
        )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default MeetingPage;
