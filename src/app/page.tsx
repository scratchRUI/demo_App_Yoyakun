"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// 取得したデータの型定義
interface SOAPSummary {
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  // これまでの summary (単一文字列) から構造化データと生テキストのStateに変更
  const [soapSummary, setSoapSummary] = useState<SOAPSummary | null>(null);
  const [rawText, setRawText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 録音開始
  const startRecording = async () => {
    setErrorMessage("");
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
        
        if (res.ok) {
           // 成功時は SOAP オブジェクトとオリジナルテキストをセット
           setSoapSummary(data.soap_summary);
           setRawText(data.original_text || "文字起こしデータなし");
        } else {
           setErrorMessage(data.error || "エラーが発生しました");
        }
      } catch (error) {
        setErrorMessage("サーバーとの通信に失敗しました。");
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
    pdf.save("医療記録_SOAP.pdf");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-3xl font-bold text-gray-800">問診要約くん (SOAP版)</h1>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-8 py-4 rounded-full text-white text-xl font-bold hover:shadow-lg transition-all ${
          isRecording ? "bg-red-500 animate-pulse hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isRecording ? "⏹ 録音を終了して解析" : "🎙 問診を録音する"}
      </button>

      {loading && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">AIが診察内容を解析・SOAP化しています...</p>
        </div>
      )}

      {errorMessage && <p className="text-red-500 font-bold bg-red-100 p-4 rounded-lg">{errorMessage}</p>}

      {soapSummary && (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div ref={summaryRef} className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            {/* ヘッダー部分 */}
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold">SOAP形式 看護記録 / カルテ</h2>
            </div>
            
            {/* S_TEXT */}
            <div className="p-6 border-b border-gray-100 bg-blue-50/30">
              <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
                <span className="bg-blue-200 text-blue-800 w-8 h-8 flex items-center justify-center rounded-lg">S</span>
                主観的情報 (Subjective)
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-10">{soapSummary.s_text}</p>
            </div>
            
            {/* O_TEXT */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                <span className="bg-green-200 text-green-800 w-8 h-8 flex items-center justify-center rounded-lg">O</span>
                客観的情報 (Objective)
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-10">{soapSummary.o_text}</p>
            </div>

            {/* A_TEXT */}
            <div className="p-6 border-b border-gray-100 bg-purple-50/30">
              <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center gap-2">
                <span className="bg-purple-200 text-purple-800 w-8 h-8 flex items-center justify-center rounded-lg">A</span>
                評価・アセスメント (Assessment)
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-10">{soapSummary.a_text}</p>
            </div>

            {/* P_TEXT */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2">
                <span className="bg-orange-200 text-orange-800 w-8 h-8 flex items-center justify-center rounded-lg">P</span>
                計画・指示 (Plan)
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-10">{soapSummary.p_text}</p>
            </div>

            {/* AI文字起こし */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-500 mb-2">音声認識による全文テキスト（参考）</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap italic bg-gray-100 p-4 rounded-lg">{rawText}</p>
            </div>
          </div>

          <button
            onClick={downloadPDF}
            className="self-center px-8 py-3 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            カルテ情報をPDFで出力する
          </button>
        </div>
      )}
    </main>
  );
}