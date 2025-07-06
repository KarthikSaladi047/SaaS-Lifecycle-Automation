"use client";
import React from "react";

type ResetConfirmationProps = {
  fqdn: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ResetConfirmation: React.FC<ResetConfirmationProps> = ({
  fqdn,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="bg-black text-white p-6 rounded-lg shadow-lg max-w-sm text-center space-y-4">
      <p>
        Do you want to reset task status of PCD <strong>{fqdn}</strong>?
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={onConfirm}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
        >
          Yes
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
        >
          No
        </button>
      </div>
    </div>
  </div>
);

export default ResetConfirmation;
