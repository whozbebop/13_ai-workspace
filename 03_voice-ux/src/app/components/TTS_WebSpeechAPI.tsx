"use client";

import { useEffect, useState } from "react";

export default function TTS_WebSpeechAPI() {
  const [hasTTSSupport, setHasTTSSupport] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantText, setAssistantText] = useState(
    "안녕하세요! 제가 대신 읽어 드릴 텍스트를 여기에 입력해 보세요.",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (typeof window.speechSynthesis !== "undefined") {
      setHasTTSSupport(true);
    }
  }, []);

  const handleSpeak = () => {
    if (!hasTTSSupport) return; // 브라우저 지원 여부 체크
    if (!assistantText.trim()) return; // 읽어줄 텍스트 존재 여부 체크

    // 텍스트 읽기 SpeechSynthesis 인스턴스 가져오기
    const synth = window.speechSynthesis;

    // 음성 재생을 위한 텍스트 객체 생성 및 설정
    const utterance = new SpeechSynthesisUtterance(assistantText.trim());

    // 이벤트 핸들러 설정
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utterance.lang = "ko-KR";
    utterance.rate = 2;
    utterance.pitch = 0.5;
    utterance.volume = 0.5;
    utterance.voice = synth.getVoices()[12];

    console.log(synth.getVoices());

    synth.speak(utterance);

    // synth.speak()
  };

  const handleStopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <section className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-5 bg-zinc-50 text-xs text-zinc-700 flex justify-between">
        <span className="font-semibold">브라우저 지원 상태 - TTS </span>{" "}
        {hasTTSSupport ? (
          <span className="text-emerald-700">지원됨 ✅</span>
        ) : (
          <span className="text-red-600">미지원 ⚠️</span>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-zinc-900">
        TTS - Web Speech API (SpeechSynthesis) 활용
      </h2>
      <p className="mb-3 text-xs text-zinc-600">
        아래 텍스트를 브라우저가 읽어 줍니다. 보통은 &quot;AI의 답변&quot; 을
        여기에 넣고 <code>SpeechSynthesis</code>로 재생합니다.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSpeak}
          disabled={!hasTTSSupport || isSpeaking}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-white transition ${
            !hasTTSSupport || isSpeaking
              ? "cursor-not-allowed bg-zinc-400"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          🔊 텍스트 읽어주기
        </button>
        <button
          type="button"
          onClick={handleStopSpeak}
          disabled={!isSpeaking}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !isSpeaking
              ? "cursor-not-allowed border border-zinc-200 bg-white text-zinc-400"
              : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          ⏹️ 읽기 중지
        </button>
        <span className="inline-flex items-center text-xs text-zinc-500">
          상태:{" "}
          <span
            className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isSpeaking
                ? "bg-indigo-50 text-indigo-700"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {isSpeaking ? "SPEAKING..." : "IDLE"}
          </span>
        </span>
      </div>

      <label className="mb-1 text-xs font-medium text-zinc-700">
        브라우저가 읽어 줄 텍스트 (보통 AI의 답변)
      </label>
      <textarea
        className="min-h-[120px] w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        placeholder="예: 사용자의 질문에 대한 AI의 답변을 여기에 넣고 재생합니다."
        value={assistantText}
        onChange={(e) => setAssistantText(e.target.value)}
      />
    </section>
  );
}
