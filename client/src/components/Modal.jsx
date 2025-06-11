import '../styles/Modal.css'

function Modal({ isOpen, message, onClose, onConfirm, showConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>알림</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {showConfirm ? (
            <>
              <button className="modal-button" onClick={onConfirm}>예</button>
              <button className="modal-button" onClick={onClose}>아니오</button>
            </>
          ) : (
            <button className="modal-button" onClick={onClose}>확인</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal; 