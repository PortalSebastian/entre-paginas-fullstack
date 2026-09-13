import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { dataTarjetas, ORDER_KEY } from '../../data/checkoutData';
import { storeApi } from '../../services/store-api';
import {
    onlyLetters,
    onlyNumbers,
    validDocument,
    validEmail,
    validPhone
} from '../../utils/validations';
import './Checkout.css';

const initialFormData = {
    nombre: '',
    documento: '',
    correo: '',
    telefono: '',
    direccion: '',
    distrito: '',
    ciudad: '',
    referencia: '',
    fechaEntrega: '',
    envio: '',
    tipoTarjeta: '',
    numeroTarjeta: '',
    titular: '',
    vencimiento: '',
    codigo: '',
    cuotas: '1',
    confirmarDatos: false
};

const formatCurrency = (price) => 'S/ ' + Number(price).toFixed(2);

function Checkout() {
    const navigate = useNavigate();
    const { items, total, clearCart } = useCart();
    const [formData, setFormData] = useState(initialFormData);
    const [message, setMessage] = useState('');
    const [shippingMethods, setShippingMethods] = useState([]);
    const [isShippingLoading, setIsShippingLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const selectedShipping = shippingMethods.find((item) => item.code === formData.envio);
    const shippingCost = selectedShipping ? selectedShipping.price : 0;
    const orderTotal = Math.round((total + shippingCost) * 100) / 100;

    useEffect(() => {
        let active = true;
        storeApi.shippingMethods()
            .then((methods) => {
                if (active) setShippingMethods(methods);
            })
            .catch(() => {
                if (active) setMessage('No se pudieron cargar los métodos de envío.');
            })
            .finally(() => {
                if (active) setIsShippingLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

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

        if (!onlyLetters(formData.nombre)) {
            setMessage('El campo Nombre completo solo debe contener letras.');
            return;
        }

        if (!validDocument(formData.documento)) {
            setMessage('El documento de identidad debe contener entre 6 y 20 dígitos.');
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

        if (!onlyLetters(formData.titular)) {
            setMessage('El campo Nombre del titular solo debe contener letras.');
            return;
        }

        if (!onlyNumbers(formData.numeroTarjeta)) {
            setMessage('El número de la tarjeta solo debe contener números.');
            return;
        }

        if (!onlyNumbers(formData.codigo)) {
            setMessage('El código de seguridad solo debe contener números.');
            return;
        }

        const cardDigits = formData.numeroTarjeta.replace(/\D/g, '');
        if (cardDigits.length < 13 || cardDigits.length > 19) {
            setMessage('El número de tarjeta debe tener entre 13 y 19 dígitos.');
            return;
        }

        if (formData.codigo.length < 3 || formData.codigo.length > 4) {
            setMessage('El código de seguridad debe tener 3 o 4 dígitos.');
            return;
        }

        const shipping = shippingMethods.find((item) => item.code === formData.envio);
        const card = dataTarjetas.find((item) => item.tipo === formData.tipoTarjeta);

        if (!shipping) {
            setMessage('Selecciona un método de envío.');
            return;
        }

        if (!card) {
            setMessage('Selecciona el tipo de tarjeta.');
            return;
        }

        if (!formData.confirmarDatos) {
            setMessage('Confirma que los datos ingresados son correctos.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        try {
            const order = await storeApi.createOrder(formData, items);
            sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
            clearCart();
            navigate('/confirmation');
        } catch (error) {
            setMessage(error.code === 'INSUFFICIENT_STOCK'
                ? 'Uno de los libros ya no tiene stock suficiente. Revisa el carrito.'
                : 'No se pudo registrar el pedido. Revisa los datos e inténtalo nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <>
                <h1 className="page-title">Finalizar pedido</h1>
                <section className="block estado-vacio">
                    <h2>Tu carrito está vacío</h2>
                    <p>Agrega libros al carrito antes de finalizar un pedido.</p>
                    <p className="actions">
                        <Link className="btn btn-primary" to="/catalog">Ir al catálogo</Link>
                    </p>
                </section>
            </>
        );
    }

    return (
        <>
            <h1 className="page-title">Finalizar pedido</h1>
            <div className="contenedor-compra checkout-layout">
                <section className="resumen-compra checkout-summary">
                    <h2>Resumen del pedido</h2>
                    <table className="tabla tabla-resumen">
                        <caption>Detalle del pedido</caption>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <th scope="row">{item.title} (x{item.quantity})</th>
                                    <td>{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                            <tr>
                                <th scope="row">Total de productos</th>
                                <td><strong>{formatCurrency(total)}</strong></td>
                            </tr>
                            <tr>
                                <th scope="row">Envío</th>
                                <td>{formatCurrency(shippingCost)}</td>
                            </tr>
                            <tr>
                                <th scope="row">Total del pedido</th>
                                <td><strong>{formatCurrency(orderTotal)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                    <p><Link to="/cart">Volver al carrito</Link></p>
                </section>

                <section className="block checkout-form-section">
                    <h2>Datos para el envío y pago</h2>
                    <p className="ayuda-campo">
                        Todos los campos son obligatorios, salvo los indicados como opcionales.
                    </p>

                    <form className="form-pedido" onSubmit={handleSubmit} onReset={handleReset}>
                        <fieldset>
                            <legend>Datos del comprador</legend>
                            <p>
                                <label htmlFor="nombre-pedido">Nombre completo:</label>
                                <input
                                    type="text"
                                    id="nombre-pedido"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="documento">Documento de identidad:</label>
                                <input
                                    type="text"
                                    id="documento"
                                    name="documento"
                                    value={formData.documento}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="correo-pedido">Correo electrónico:</label>
                                <input
                                    type="email"
                                    id="correo-pedido"
                                    name="correo"
                                    value={formData.correo}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="telefono-pedido">Teléfono:</label>
                                <input
                                    type="tel"
                                    id="telefono-pedido"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                        </fieldset>

                        <fieldset>
                            <legend>Dirección de entrega</legend>
                            <p className="ancho-total">
                                <label htmlFor="direccion">Dirección:</label>
                                <input
                                    type="text"
                                    id="direccion"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="distrito">Distrito:</label>
                                <input
                                    type="text"
                                    id="distrito"
                                    name="distrito"
                                    value={formData.distrito}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="ciudad">Ciudad:</label>
                                <select
                                    id="ciudad"
                                    name="ciudad"
                                    value={formData.ciudad}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona una ciudad</option>
                                    <option value="lima">Lima</option>
                                    <option value="arequipa">Arequipa</option>
                                    <option value="cusco">Cusco</option>
                                    <option value="trujillo">Trujillo</option>
                                    <option value="otra">Otra ciudad</option>
                                </select>
                            </p>
                            <p className="ancho-total">
                                <label htmlFor="referencia">
                                    Referencia para encontrar la dirección (opcional):
                                </label>
                                <textarea
                                    id="referencia"
                                    name="referencia"
                                    rows="4"
                                    value={formData.referencia}
                                    onChange={handleChange}
                                />
                            </p>
                            <p className="ancho-total">
                                <label htmlFor="fecha-entrega">Fecha preferida de entrega:</label>
                                <input
                                    type="date"
                                    id="fecha-entrega"
                                    name="fechaEntrega"
                                    value={formData.fechaEntrega}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                        </fieldset>

                        <fieldset>
                            <legend>Método de envío</legend>
                            <p className="ancho-total">
                                <label htmlFor="metodo-envio">Selecciona el método:</label>
                                <select
                                    id="metodo-envio"
                                    name="envio"
                                    value={formData.envio}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona una opción</option>
                                    {shippingMethods.map((shipping) => (
                                        <option key={shipping.code} value={shipping.code}>
                                            {shipping.name} — {shipping.price === 0
                                                ? 'Gratis'
                                                : formatCurrency(shipping.price)}
                                        </option>
                                    ))}
                                </select>
                                {isShippingLoading && <span className="ayuda-campo">Cargando opciones…</span>}
                            </p>
                        </fieldset>

                        <fieldset>
                            <legend>Datos de la tarjeta</legend>
                            <p className="ayuda-campo ancho-total">
                                El pago se realiza con tarjeta de crédito o débito.
                            </p>
                            <p>
                                <label htmlFor="tipo-tarjeta">Tipo de tarjeta:</label>
                                <select
                                    id="tipo-tarjeta"
                                    name="tipoTarjeta"
                                    value={formData.tipoTarjeta}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona el tipo de tarjeta</option>
                                    {dataTarjetas.map((card) => (
                                        <option key={card.tipo} value={card.tipo}>{card.nombre}</option>
                                    ))}
                                </select>
                            </p>
                            <p>
                                <label htmlFor="numero-tarjeta">Número de la tarjeta:</label>
                                <input
                                    type="text"
                                    id="numero-tarjeta"
                                    name="numeroTarjeta"
                                    value={formData.numeroTarjeta}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="titular-tarjeta">Nombre del titular:</label>
                                <input
                                    type="text"
                                    id="titular-tarjeta"
                                    name="titular"
                                    value={formData.titular}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="vencimiento-tarjeta">Fecha de vencimiento:</label>
                                <input
                                    type="month"
                                    id="vencimiento-tarjeta"
                                    name="vencimiento"
                                    value={formData.vencimiento}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="codigo-seguridad">Código de seguridad (CVV):</label>
                                <input
                                    type="password"
                                    id="codigo-seguridad"
                                    name="codigo"
                                    value={formData.codigo}
                                    onChange={handleChange}
                                    required
                                />
                            </p>
                            <p>
                                <label htmlFor="cuotas">Número de cuotas:</label>
                                <select
                                    id="cuotas"
                                    name="cuotas"
                                    value={formData.cuotas}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="1">Sin cuotas (pago único)</option>
                                    <option value="3">3 cuotas</option>
                                    <option value="6">6 cuotas</option>
                                    <option value="12">12 cuotas</option>
                                </select>
                            </p>
                        </fieldset>

                        <p>
                            <input
                                type="checkbox"
                                id="confirmar-datos"
                                name="confirmarDatos"
                                checked={formData.confirmarDatos}
                                onChange={handleChange}
                                required
                            />{' '}
                            <label className="etiqueta-opcion" htmlFor="confirmar-datos">
                                Confirmo que los datos ingresados son correctos.
                            </label>
                        </p>

                        <p className="form-message" aria-live="polite">{message}</p>
                        <p className="actions">
                            <button className="btn btn-primary" type="submit" disabled={isSubmitting || isShippingLoading}>
                                {isSubmitting ? 'Registrando…' : 'Confirmar pedido'}
                            </button>
                            <button className="btn btn-outline" type="reset">Limpiar formulario</button>
                        </p>
                    </form>
                </section>
            </div>
        </>
    );
}

export default Checkout;
