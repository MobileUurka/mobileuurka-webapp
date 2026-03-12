import React from 'react';

const Document: React.FC<{ document: any }> = ({ document }) => {
  if (!document) return <div className="p-10 text-center">No document selected</div>;

  return (
    <div className="document-detail animate-in fade-in duration-300">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold">{document.testName || "Report Detail"}</h2>
        <p className="text-gray-400 text-sm">Issued on: {new Date(document.createdAt).toLocaleDateString()}</p>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-2xl">
        <pre className="whitespace-pre-wrap font-sans text-gray-700">
          {document.results || "No detailed results available for this record."}
        </pre>
      </div>
    </div>
  );
};

export default Document;