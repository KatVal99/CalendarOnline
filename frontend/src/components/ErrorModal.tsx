
interface Props {
  title: string;
  message: string;
  onClose: () => void;
}

export default function ErrorModal({ title, message, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>⚠️ {title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

