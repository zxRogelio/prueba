import { useEffect, useRef, useState } from "react";
import { useOnline } from "./useOnline";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function useVoiceSearch(onTranscript: (text: string) => void) {
  const online = useOnline();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const speechWindow = window as SpeechWindow;
  const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      recognition.abort();
    }
  }, []);
  useEffect(() => {
    if (!online) recognitionRef.current?.abort();
  }, [online]);
  const toggle = () => {
    if (listening) { recognitionRef.current?.abort(); return; }
    if (!Constructor || !online) return;
    const recognition = new Constructor();
    recognition.lang = "es-MX";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => onTranscript(event.results[0][0].transcript.trim());
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = ({ error: code }) => {
      const errors: Record<string, string> = {
        "not-allowed": "Permiso de micrófono denegado. Puedes habilitarlo en tu navegador o escribir tu búsqueda.",
        "service-not-allowed": "El navegador no permite el reconocimiento de voz.",
        "audio-capture": "No se encontró un micrófono disponible.",
        "no-speech": "No se detectó voz. Intenta de nuevo.",
        network: "El reconocimiento de voz necesita conexión en este navegador.",
      };
      if (code !== "aborted") setError(errors[code] || "No se pudo reconocer la voz. Puedes buscar por texto.");
      setListening(false);
    };
    recognitionRef.current = recognition;
    setError("");
    try { recognition.start(); setListening(true); }
    catch { setError("No se pudo iniciar el micrófono. Intenta de nuevo."); setListening(false); }
  };
  return { supported: Boolean(Constructor), online, listening, error, toggle };
}
