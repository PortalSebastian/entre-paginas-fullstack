import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { validEmail } from '../../utils/validations';
import './Login.css';

function Login() {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ correo: '', contrasena: '' });
    const [message, setMessage] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        setFormData((current) => ({
            ...current,
            [event.target.name]: event.target.value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (formData.correo === '' || formData.contrasena === '') {
            setMessage('Completa el correo y la contraseña.');
            return;
        }

        if (!validEmail(formData.correo)) {
            setMessage('Ingresa un correo electrónico válido.');
            return;
        }

        setIsSubmitting(true);
        try {
            await login(formData.correo, formData.contrasena);
            setLoggedIn(true);
            setMessage('Sesión iniciada correctamente.');
        } catch {
            setMessage('El correo o la contraseña no coinciden con ninguna cuenta registrada.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <h1 className="page-title">Iniciar sesión</h1>
            <section className="formulario formulario-angosto">
                <h2>Bienvenido nuevamente</h2>
                <p>Ingresa tus datos para continuar comprando.</p>

                {!loggedIn && (
                    <form className="form-login" onSubmit={handleSubmit}>
                        <p>
                            <label htmlFor="correo-login">Correo electrónico:</label>
                            <input
                                type="email"
                                id="correo-login"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="contrasena-login">Contraseña:</label>
                            <input
                                type="password"
                                id="contrasena-login"
                                name="contrasena"
                                value={formData.contrasena}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p className="actions">
                            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Ingresando…' : 'Ingresar'}
                            </button>
                        </p>
                    </form>
                )}

                <p className="form-message" aria-live="polite">{message}</p>

                {loggedIn ? (
                    <p><Link to="/catalog">Ir al catálogo</Link>.</p>
                ) : (
                    <div>
                        <p>¿Todavía no tienes una cuenta? <Link to="/register">Regístrate aquí</Link>.</p>
                        <p className="note">
                            También puedes <Link to="/cart">comprar como invitado</Link>, sin crear
                            una cuenta.
                        </p>
                    </div>
                )}
            </section>
        </>
    );
}

export default Login;
