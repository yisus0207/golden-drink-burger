import React from 'react';

export default function ConfirmModal({ isOpen, title, message, context, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all">
        {/* Header con icono */}
        <div className="p-6 pb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
          {context && (
            <p className="text-gold font-medium mt-3 text-sm border-l-2 border-gold pl-3">
              {context}
            </p>
          )}
        </div>

        {/* Footer (Botones) */}
        <div className="px-6 py-4 bg-dark-surface border-t border-dark-border flex gap-3 justify-end items-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-black transition-all"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
