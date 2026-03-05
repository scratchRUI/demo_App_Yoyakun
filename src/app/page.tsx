"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { PastRecordsPanel } from "@/components/past-records-panel";
import { PatientSelection } from "@/components/patient-selection";
import { SoapSummaryCard } from "@/components/soap-summary-card";
import { addPatient, getPatientRecords, getPatients, summarizePatientAudio } from "@/lib/medical-api";
import type { PastRecord, Patient, SOAPSummary } from "@/types/medical";

function getErrorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const [soapSummary, setSoapSummary] = useState<SOAPSummary | null>(null);
  const [rawText, setRawText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newPatientName, setNewPatientName] = useState("");

  const [pastRecords, setPastRecords] = useState<PastRecord[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadPatients();
  }, []);

  const resetSessionView = () => {
    setSoapSummary(null);
    setRawText("");
    setErrorMessage("");
    setExpandedRecordId(null);
  };

  const loadPatients = async () => {
    try {
      const patientList = await getPatients();
      setPatients(patientList);
    } catch (error) {
      setErrorMessage(getErrorText(error, "患者一覧の取得に失敗しました"));
    }
  };

  const loadPatientRecords = async (patientId: number) => {
    try {
      const records = await getPatientRecords(patientId);
      setPastRecords(records);
    } catch (error) {
      setErrorMessage(getErrorText(error, "記録の取得に失敗しました"));
    }
  };

  const createPatient = async () => {
    const trimmedName = newPatientName.trim();
    if (!trimmedName || isCreatingPatient) {
      return;
    }

    setErrorMessage("");
    setIsCreatingPatient(true);

    try {
      await addPatient(trimmedName);
      setNewPatientName("");
      await loadPatients();
    } catch (error) {
      setErrorMessage(getErrorText(error, "患者の作成に失敗しました"));
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    resetSessionView();
    await loadPatientRecords(patient.id);
  };

  const goBack = () => {
    setSelectedPatient(null);
    setPastRecords([]);
    resetSessionView();
  };

  const startRecording = async () => {
    setErrorMessage("");
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("このブラウザでは音声録音に対応していません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onerror = () => {
        setErrorMessage("録音中にエラーが発生しました。");
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      setErrorMessage(getErrorText(error, "マイクへのアクセスに失敗しました。"));
    }
  };

  const stopRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      return;
    }

    if (!selectedPatient) {
      setErrorMessage("患者を選択してから録音を停止してください。");
      return;
    }

    const patientId = selectedPatient.id;
    setIsRecording(false);
    setLoading(true);

    mediaRecorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const result = await summarizePatientAudio(patientId, audioBlob);

        setSoapSummary(result.soapSummary);
        setRawText(result.originalText);
        await loadPatientRecords(patientId);
      } catch (error) {
        setErrorMessage(getErrorText(error, "サーバーとの通信に失敗しました。"));
      } finally {
        setLoading(false);
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
    };

    mediaRecorder.stop();
  };

  const downloadPDF = async () => {
    const target = summaryRef.current;
    if (!target) {
      return;
    }

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
        <PatientSelection
          patients={patients}
          newPatientName={newPatientName}
          onNewPatientNameChange={setNewPatientName}
          onCreatePatient={createPatient}
          onSelectPatient={selectPatient}
          isCreatingPatient={isCreatingPatient}
        />
      ) : (
        <div className="w-full max-w-4xl flex flex-col gap-6">
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
            <SoapSummaryCard
              summary={soapSummary}
              rawText={rawText}
              summaryRef={summaryRef}
              onDownloadPdf={downloadPDF}
            />
          )}

          <PastRecordsPanel
            records={pastRecords}
            expandedRecordId={expandedRecordId}
            onToggleRecord={(recordId) => {
              setExpandedRecordId((currentId) => (currentId === recordId ? null : recordId));
            }}
          />
        </div>
      )}
    </main>
  );
}
