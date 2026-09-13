import './Button.css';

function Button({ children, onClick, variant = 'primary', type = 'button', className = '', disabled = false }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`btn btn-${variant} ${className}`}
        >
            {children}
        </button>
    );
}

export default Button;
