import Modal from '../common/Modal';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  songTitle: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, songTitle }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Song" className="w-[420px]">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[14px] text-[#F5F0EB]">
              Are you sure you want to permanently delete <span className="font-semibold text-[#E8630A]">"{songTitle}"</span>?
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#9A9080]">
              This action will remove the song from your Cadence library and permanently wipe the physical file from your local storage drive. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium text-[#9A9080] hover:text-[#F5F0EB] transition-colors bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
          >
            <X size={15} />
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-2 rounded-md bg-red-600/90 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-900/20"
          >
            <Trash2 size={15} />
            Delete Permanently
          </button>
        </div>
      </div>
    </Modal>
  );
}
