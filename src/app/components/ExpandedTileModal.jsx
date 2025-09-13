import React from 'react';

const ExpandedTileModal = ({ tile, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Expanded Tile View</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            ×
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">Expanded tile modal will be implemented in the next phase</p>
        </div>
      </div>
    </div>
  );
};

export default ExpandedTileModal;
