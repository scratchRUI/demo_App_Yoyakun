export interface SOAPSummary {
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
}

export interface Patient {
  id: number;
  name: string;
  created_at: string;
}

export interface PastRecord {
  id: number;
  created_at: string;
  s_text: string;
  o_text: string;
  a_text: string;
  p_text: string;
  raw_text: string;
}

interface ApiError {
  error?: string;
}

export interface SummarizeResponse extends ApiError {
  soap_summary?: SOAPSummary;
  original_text?: string;
}
