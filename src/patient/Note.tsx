import React from 'react';

interface NoteDetailProps {
  note: any;
  user: any;
}

const Note: React.FC<NoteDetailProps> = ({ note, user }) => {
  return (
    <div className="note-view max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
          {user?.firstName?.charAt(0) || 'D'}
        </div>
        <div>
          <p className="text-sm font-bold">Dr. {user?.lastName || 'Staff'}</p>
          <p className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <h1 className="text-xl font-bold mb-4">{note.title || "Clinical Note"}</h1>
      <div className="prose max-w-none text-gray-800 leading-relaxed">
        {note.content}
      </div>
    </div>
  );
};

export default Note;