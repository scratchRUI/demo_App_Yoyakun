"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 録音開始
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  // 録音停止
  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    setIsRecording(false);
    setLoading(true);

    //stopは非同期のため待つ
    mediaRecorder.onstop = async() => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      //APIに送信
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      try {
        const res = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });
        const data = await res.json();
        setSummary(data.summary || data.error);
    } catch (error) {
      setSummary("エラーが発生しました");
    } finally {
      setLoading(false);
    }

    //マイクをオフにする
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  };
};

  // PDF出力
  const downloadPDF = async () => {
    const target = summaryRef.current;
    if (!target) return;

    const canvas = await html2canvas(target, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    pdf.save("要約結果.pdf");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-2xl font-bold">問診要約くん</h1>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-lg text-white text-lg font-semibold ${
          isRecording ? "bg-red-500" : "bg-blue-500"
        }`}
      >
        {isRecording ? "⏹ 録音停止" : "🎙 録音開始"}
      </button>

      {loading && <p className="text-gray-500">要約中...</p>}

      {summary && (
        <>
          <div ref={summaryRef} className="w-full max-w-xl bg-gray-100 rounded-lg p-6">
            <h2 className="font-bold mb-2">要約結果</h2>
            <p className="whitespace-pre-wrap">{summary}</p>
          </div>
          <button
            onClick={downloadPDF}
            className="px-6 py-3 rounded-lg bg-green-600 text-white text-lg font-semibold hover:bg-green-700 transition"
          >
            📄 PDF出力
          </button>
        </>
      )}
    </main>
  );
}
    