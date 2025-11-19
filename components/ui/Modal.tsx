import React from 'react';
import { Icons } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-200 rounded-t flex-shrink-0">
          <h3 className="text-xl font-semibold text-slate-900" id="modal-title">
            {title}
          </h3>
          <button type="button" className="text-slate-400 bg-transparent hover:bg-slate-200 hover:text-slate-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center" onClick={onClose}>
            <Icons.X className="w-5 h-5" />
            <span className="sr-only">إغلاق النافذة</span>
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};