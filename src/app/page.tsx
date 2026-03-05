"use client";

import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// 取得したデータの型定義
interface SOAPSummary {
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
}

interface Patient {
  id: number;
  name: string;
  created_at: string;
}

interface PastRecord {
  id: number;
  created_at: string;
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
  raw_text: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soapSummary, setSoapSummary] = useState<SOAPSummary | null>(null);
  const [rawText, setRawText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 患者関連
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newPatientName, setNewPatientName] = useState("");

  // 過去記録
  const [pastRecords, setPastRecords] = useState<PastRecord[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 初回に患者一覧を取得
  useEffect(() => {
    fetchPatients();
  }, []);

  // 患者一覧取得
  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      console.error("患者一覧の取得に失敗:", error);
    }
  };

  // 患者作成
  const createPatient = async () => {
    if (!newPatientName.trim()) return;
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPatientName.trim() }),
      });
      if (res.ok) {
        setNewPatientName("");
        fetchPatients();
      }
    } catch (error) {
      console.error("患者の作成に失敗:", error);
    }
  };

  // 患者選択
  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSoapSummary(null);
    setRawText("");
    setErrorMessage("");
    await fetchPatientRecords(patient.id);
  };

  // 過去記録取得
  const fetchPatientRecords = async (patientId: number) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/records`);
      if (res.ok) {
        const data = await res.json();
        setPastRecords(data);
      }
    } catch (error) {
      console.error("記録の取得に失敗:", error);
    }
  };

  // 患者選択解除（戻る）
  const goBack = () => {
    setSelectedPatient(null);
    setPastRecords([]);
    setSoapSummary(null);
    setRawText("");
    setErrorMessage("");
  };

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
      formData.append("patient_id", String(selectedPatient!.id));

      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          body: formData,
        });
        
        const data = await res.json();
        
        if (res.ok) {
           setSoapSummary(data.soap_summary);
           setRawText(data.original_text || "文字起こしデータなし");
           // 過去記録リストを更新
           fetchPatientRecords(selectedPatient!.id);
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
    <main className="min-h-screen flex flex-col items-center p-8 gap-6">
      <h1 className="text-3xl font-bold text-gray-800">問診要約くん (SOAP版)</h1>

      {!selectedPatient ? (
        // === 画面1: 患者選択 ===
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* 新規患者作成 */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">新規患者を追加</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createPatient()}
                placeholder="患者名を入力"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createPatient}
                disabled={!newPatientName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                追加
              </button>
            </div>
          </div>

          {/* 患者一覧 */}
          <div className="bg-white shadow rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">患者一覧</h2>
            {patients.length === 0 ? (
              <p className="text-gray-500">患者が登録されていません</p>
            ) : (
              <div className="flex flex-col gap-2">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition text-left"
                  >
                    <div>
                      <span className="font-semibold text-gray-800">{patient.name}</span>
                      <span className="ml-3 text-sm text-gray-500">ID: {patient.id}</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // === 画面2: 録音 + 過去記録 ===
        <div className="w-full max-w-4xl flex flex-col gap-6">
          {/* ヘッダー: 患者名 + 戻るボタン */}
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              ← 戻る
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedPatient.name}
              <span className="ml-2 text-sm font-normal text-gray-500">ID: {selectedPatient.id}</span>
            </h2>
          </div>

          {/* 録音ボタン */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-8 py-4 rounded-full text-white text-xl font-bold hover:shadow-lg transition-all ${
              isRecording ? "bg-red-500 animate-pulse hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isRecording ? "⏹ 録音を終了して解析" : "🎙 問診を録音する"}
          </button>

          {/* ローディング */}
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">AIが診察内容を解析・SOAP化しています...</p>
            </div>
          )}

          {/* エラー */}
          {errorMessage && <p className="text-red-500 font-bold bg-red-100 p-4 rounded-lg">{errorMessage}</p>}

          {/* 現在のSOAP結果 */}
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

          {/* === 過去の記録 === */}
          {pastRecords.length > 0 && (
            <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
              <div className="bg-gray-700 text-white px-6 py-3">
                <h3 className="font-bold">過去の問診記録</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {pastRecords.map((record) => (
                  <div key={record.id} className="p-4">
                    <button
                      onClick={() =>
                        setExpandedRecordId(
                          expandedRecordId === record.id ? null : record.id
                        )
                      }
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-gray-800">
                        {new Date(record.created_at).toLocaleString("ja-JP")}
                      </span>
                      <span className="text-gray-400">
                        {expandedRecordId === record.id ? "▲" : "▼"}
                      </span>
                    </button>
                    {expandedRecordId === record.id && (
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                        <div>
                          <span className="text-sm font-bold text-blue-700">S:</span>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.s_text}</p>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-green-700">O:</span>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.o_text}</p>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-purple-700">A:</span>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.a_text}</p>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-orange-700">P:</span>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.p_text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}