import type { PastRecord, Patient, SOAPSummary, SummarizeResponse } from "@/types/medical";

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await parseJsonSafe<{ error?: string }>(response);
  return payload?.error ?? fallback;
}

export async function getPatients(): Promise<Patient[]> {
  const response = await fetch("/api/patients");
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "患者一覧の取得に失敗しました"));
  }

  const payload = await parseJsonSafe<Patient[]>(response);
  return payload ?? [];
}

export async function addPatient(name: string): Promise<Patient> {
  const response = await fetch("/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "患者の作成に失敗しました"));
  }

  const payload = await parseJsonSafe<Patient>(response);
  if (!payload) {
    throw new Error("患者作成レスポンスの形式が不正です");
  }

  return payload;
}

export async function getPatientRecords(patientId: number): Promise<PastRecord[]> {
  const response = await fetch(`/api/patients/${patientId}/records`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "記録の取得に失敗しました"));
  }

  const payload = await parseJsonSafe<PastRecord[]>(response);
  return payload ?? [];
}

export async function summarizePatientAudio(
  patientId: number,
  audioBlob: Blob
): Promise<{ soapSummary: SOAPSummary; originalText: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("patient_id", String(patientId));

  const response = await fetch("/api/summarize", {
    method: "POST",
    body: formData,
  });

  const payload = await parseJsonSafe<SummarizeResponse>(response);
  if (!response.ok) {
    throw new Error(payload?.error ?? "サマリー作成に失敗しました");
  }

  if (!payload?.soap_summary) {
    throw new Error("SOAPサマリーの取得に失敗しました");
  }

  return {
    soapSummary: payload.soap_summary,
    originalText: payload.original_text ?? "文字起こしデータなし",
  };
}
