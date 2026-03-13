import type { RefObject } from "react";

import type { SOAPSummary } from "@/types/medical";

const SECTIONS: Array<{
  key: keyof SOAPSummary;
  heading: string;
  label: string;
  containerClassName: string;
  badgeClassName: string;
  headingClassName: string;
}> = [
  {
    key: "s_text",
    heading: "S",
    label: "主観的情報 (Subjective)",
    containerClassName: "p-6 border-b border-gray-100 bg-blue-50/30",
    badgeClassName: "bg-blue-200 text-blue-800",
    headingClassName: "text-blue-800",
  },
  {
    key: "o_text",
    heading: "O",
    label: "客観的情報 (Objective)",
    containerClassName: "p-6 border-b border-gray-100",
    badgeClassName: "bg-green-200 text-green-800",
    headingClassName: "text-green-800",
  },
  {
    key: "a_text",
    heading: "A",
    label: "評価・アセスメント (Assessment)",
    containerClassName: "p-6 border-b border-gray-100 bg-purple-50/30",
    badgeClassName: "bg-purple-200 text-purple-800",
    headingClassName: "text-purple-800",
  },
  {
    key: "p_text",
    heading: "P",
    label: "計画・指示 (Plan)",
    containerClassName: "p-6 border-b border-gray-100",
    badgeClassName: "bg-orange-200 text-orange-800",
    headingClassName: "text-orange-800",
  },
];

type SoapSummaryCardProps = {
  summary: SOAPSummary;
  rawText: string;
  summaryRef: RefObject<HTMLDivElement | null>;
  onDownloadPdf: () => void;
};

export function SoapSummaryCard({
  summary,
  rawText,
  summaryRef,
  onDownloadPdf,
}: SoapSummaryCardProps) {
  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div ref={summaryRef} className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold">SOAP形式 看護記録 / カルテ</h2>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.key} className={section.containerClassName}>
            <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${section.headingClassName}`}>
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${section.badgeClassName}`}>
                {section.heading}
              </span>
              {section.label}
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-10">{summary[section.key]}</p>
          </div>
        ))}

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h3 className="text-sm font-bold text-gray-500 mb-2">音声認識による全文テキスト（参考）</h3>
          <p className="text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap italic bg-gray-100 p-4 rounded-lg">
            {rawText}
          </p>
        </div>
      </div>

      <button
        onClick={onDownloadPdf}
        className="self-center px-8 py-3 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        カルテ情報をPDFで出力する
      </button>
    </div>
  );
}
