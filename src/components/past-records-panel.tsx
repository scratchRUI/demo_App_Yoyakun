import type { PastRecord } from "@/types/medical";

type PastRecordsPanelProps = {
  records: PastRecord[];
  expandedRecordId: number | null;
  onToggleRecord: (recordId: number) => void;
};

export function PastRecordsPanel({
  records,
  expandedRecordId,
  onToggleRecord,
}: PastRecordsPanelProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
      <div className="bg-gray-700 text-white px-6 py-3">
        <h3 className="font-bold">過去の問診記録</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {records.map((record) => (
          <div key={record.id} className="p-4">
            <button
              onClick={() => onToggleRecord(record.id)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-medium text-gray-800">
                {new Date(record.created_at).toLocaleString("ja-JP")}
              </span>
              <span className="text-gray-400">{expandedRecordId === record.id ? "▲" : "▼"}</span>
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
  );
}
