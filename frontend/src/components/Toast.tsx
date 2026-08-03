
interface Props {
  message: string | null;
  onClose: () => void;
}

export default function Toast({ message, onClose }: Props) {
  if (!message) return null;
  return (
    <div className="toast" onClick={onClose}>
      {message}
    </div>
  );
}

