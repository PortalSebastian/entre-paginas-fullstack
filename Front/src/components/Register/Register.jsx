import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { onlyLetters, validEmail, validPhone } from '../../utils/validations';
import './Register.css';

const initialFormData = {
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    fechaNacimiento: '',
    contrasena: '',
    preferencia: '',
    terminos: false,
    novedades: false
};

function Register() {
    const { register } = useAuth();
    const [formData, setFormData] = useState(initialFormData);
    const [message, setMessage] = useState('');
    const [registered, setRegistered] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleReset = () => {
        setFormData(initialFormData);
        setMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            formData.nombres === '' ||
            formData.apellidos === '' ||
            formData.correo === '' ||
            formData.telefono === '' ||
            formData.fechaNacimiento === '' ||
            formData.contrasena === ''
        ) {
            setMessage('Completa todos los datos obligatorios del formulario.');
            return;
        }

        if (!onlyLetters(formData.nombres)) {
            setMessage('El campo Nombres solo debe contener letras.');
            return;
        }

        if (!onlyLetters(formData.apellidos)) {
            setMessage('El campo Apellidos solo debe contener letras.');
            return;
        }

        if (!validEmail(formData.correo)) {
            setMessage('Ingresa un correo electrónico válido.');
            return;
        }

        if (!validPhone(formData.telefono)) {
            setMessage('El campo Teléfono debe contener solo números y tener al menos 7 dígitos.');
            return;
        }

        if (formData.contrasena.length < 8) {
            setMessage('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (!formData.terminos) {
            setMessage('Debes aceptar los términos y condiciones para crear la cuenta.');
            return;
        }

        setIsSubmitting(true);
        try {
            await register(formData);
            setRegistered(true);
            setMessage('Cuenta creada correctamente para ' + formData.nombres + '.');
        } catch (error) {
            setMessage(error.code === 'EMAIL_ALREADY_REGISTERED'
                ? 'El correo ingresado ya pertenece a una cuenta registrada.'
                : 'No se pudo crear la cuenta. Revisa los datos e inténtalo nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <h1 className="page-title">Crear una cuenta</h1>
            <section className="formulario formulario-ancho">
                <h2>Registro de usuario</h2>
                <p>Completa tus datos para formar parte de nuestra comunidad de lectores.</p>
                <p className="ayuda-campo">
                    Crear una cuenta es opcional: también puedes{' '}
                    <Link to="/cart">comprar como invitado</Link>.
                </p>

                {!registered && (
                    <form className="form-registro" onSubmit={handleSubmit} onReset={handleReset}>
                        <p>
                            <label htmlFor="nombres">Nombres:</label>
                            <input
                                type="text"
                                id="nombres"
                                name="nombres"
                                value={formData.nombres}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="apellidos">Apellidos:</label>
                            <input
                                type="text"
                                id="apellidos"
                                name="apellidos"
                                value={formData.apellidos}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="correo-registro">Correo electrónico:</label>
                            <input
                                type="email"
                                id="correo-registro"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="telefono-registro">Teléfono:</label>
                            <input
                                type="tel"
                                id="telefono-registro"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="fecha-nacimiento">Fecha de nacimiento:</label>
                            <input
                                type="date"
                                id="fecha-nacimiento"
                                name="fechaNacimiento"
                                value={formData.fechaNacimiento}
                                onChange={handleChange}
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor="contrasena-registro">Contraseña:</label>
                            <input
                                type="password"
                                id="contrasena-registro"
                                name="contrasena"
                                value={formData.contrasena}
                                onChange={handleChange}
                                required
                            />
                        </p>

                        <fieldset className="opciones-linea">
                            <legend>Preferencia de lectura (opcional)</legend>
                            <p>
                                <input
                                    type="radio"
                                    id="ficcion"
                                    name="preferencia"
                                    value="ficcion"
                                    checked={formData.preferencia === 'ficcion'}
                                    onChange={handleChange}
                                />{' '}
                                <label className="etiqueta-opcion" htmlFor="ficcion">Ficción</label>
                            </p>
                            <p>
                                <input
                                    type="radio"
                                    id="clasicos"
                                    name="preferencia"
                                    value="clasicos"
                                    checked={formData.preferencia === 'clasicos'}
                                    onChange={handleChange}
                                />{' '}
                                <label className="etiqueta-opcion" htmlFor="clasicos">Clásicos</label>
                            </p>
                            <p>
                                <input
                                    type="radio"
                                    id="infantil"
                                    name="preferencia"
                                    value="infantil"
                                    checked={formData.preferencia === 'infantil'}
                                    onChange={handleChange}
                                />{' '}
                                <label className="etiqueta-opcion" htmlFor="infantil">
                                    Literatura infantil
                                </label>
                            </p>
                        </fieldset>

                        <p className="ancho-total">
                            <input
                                type="checkbox"
                                id="terminos"
                                name="terminos"
                                checked={formData.terminos}
                                onChange={handleChange}
                            />{' '}
                            <label className="etiqueta-opcion" htmlFor="terminos">
                                Acepto los términos y condiciones.
                            </label>
                        </p>
                        <p className="ancho-total">
                            <input
                                type="checkbox"
                                id="novedades"
                                name="novedades"
                                checked={formData.novedades}
                                onChange={handleChange}
                            />{' '}
                            <label className="etiqueta-opcion" htmlFor="novedades">
                                Deseo recibir novedades y recomendaciones.
                            </label>
                        </p>
                        <p className="actions ancho-total">
                            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Creando…' : 'Crear cuenta'}
                            </button>
                            <button className="btn btn-outline" type="reset">Limpiar formulario</button>
                        </p>
                    </form>
                )}

                <p className="form-message" aria-live="polite">{message}</p>
                {registered ? (
                    <p>Ya puedes <Link to="/login">iniciar sesión</Link> con tu cuenta.</p>
                ) : (
                    <p>¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>.</p>
                )}
            </section>
        </>
    );
}

export default Register;
