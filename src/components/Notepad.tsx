import React, { useState } from 'react';
import { type PatientData } from '../types/patient';

interface NotepadProps {
  patient: PatientData;
  user: any; // The current doctor/staff
}

const Notepad: React.FC<NotepadProps> = ({ patient, user }) => {
  const [content, setContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSaveNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    
    try {
      // Logic for saving via patientService or apiPost
      console.log("Saving note for patient:", patient.id, "by user:", user?.id);
      // Example: await patientService.addNote(patient.id, { content, authorId: user.id });
      alert("Note saved successfully!");
      setContent(""); 
    } catch (error) {
      console.error("Failed to save note", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notepad-container h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">New Note for {patient.firstName}</h3>
        <button 
          onClick={handleSaveNote}
          disabled={saving || !content.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Note"}
        </button>
      </div>

      <textarea
        className="flex-1 w-full p-4 border rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Start typing clinical observations..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      
      <div className="mt-2 text-xs text-gray-400">
        Signed by: Dr. {user?.lastName || 'Authorized Staff'}
      </div>
    </div>
  );
};

export default Notepad;