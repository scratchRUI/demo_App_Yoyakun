import type { Patient } from "@/types/medical";

type PatientSelectionProps = {
  patients: Patient[];
  newPatientName: string;
  onNewPatientNameChange: (name: string) => void;
  onCreatePatient: () => void;
  onSelectPatient: (patient: Patient) => void;
  isCreatingPatient: boolean;
};

export function PatientSelection({
  patients,
  newPatientName,
  onNewPatientNameChange,
  onCreatePatient,
  onSelectPatient,
  isCreatingPatient,
}: PatientSelectionProps) {
  const isCreateDisabled = !newPatientName.trim() || isCreatingPatient;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">新規患者を追加</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newPatientName}
            onChange={(event) => onNewPatientNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onCreatePatient();
              }
            }}
            placeholder="患者名を入力"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onCreatePatient}
            disabled={isCreateDisabled}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isCreatingPatient ? "作成中..." : "追加"}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">患者一覧</h2>
        {patients.length === 0 ? (
          <p className="text-gray-500">患者が登録されていません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
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
  );
}
