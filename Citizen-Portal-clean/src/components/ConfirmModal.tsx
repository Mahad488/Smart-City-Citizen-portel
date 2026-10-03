import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Trash2, X } from "lucide-react";
import "./ConfirmModal.css";

type ConfirmTone = "danger" | "primary" | "success";

interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  warning?: string;
  confirmLabel: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmModal({
  title,
  message,
  warning,
  confirmLabel,
  tone = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const Icon = tone === "danger" ? Trash2 : tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className="confirm-modal-overlay" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div className={`confirm-modal-icon confirm-modal-icon-${tone}`}>
          <Icon size={28} />
        </div>

        <h2 id="confirm-modal-title">{title}</h2>
        <p className="confirm-modal-message">{message}</p>
        {warning && <p className="confirm-modal-warning">{warning}</p>}

        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`confirm-modal-confirm confirm-modal-confirm-${tone}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : <><Icon size={17} /> {confirmLabel}</>}
          </button>
        </div>

        <button type="button" className="confirm-modal-close" onClick={onCancel} aria-label="Close" disabled={loading}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default ConfirmModal;
