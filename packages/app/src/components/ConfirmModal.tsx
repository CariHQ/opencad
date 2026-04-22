import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel, danger = true }: ConfirmModalProps): React.ReactElement {
  const { t } = useTranslation('dialogs');
  const resolvedConfirm = confirmLabel ?? t('confirmDelete.confirm', { defaultValue: 'Delete' });
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box confirm-modal">
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>{t('confirmDelete.cancel', { defaultValue: 'Cancel' })}</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} autoFocus>
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
