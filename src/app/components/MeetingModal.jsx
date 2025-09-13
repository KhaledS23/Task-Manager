import React from 'react';

const MeetingModal = ({ meeting, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Meeting Details</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            ×
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Meeting modal will be implemented in the next phase</p>
        </div>
      </div>
    </div>
  );
};

export default MeetingModal;
