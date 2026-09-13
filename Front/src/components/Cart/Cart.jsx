import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import './Cart.css';

const formatCurrency = (price) => 'S/ ' + Number(price).toFixed(2);

function Cart() {
    const { isAuthenticated } = useAuth();
    const { items, removeFromCart, updateQuantity, total } = useCart();
    const [announcement, setAnnouncement] = useState('');

    const changeQuantity = (item, step) => {
        const nextQuantity = item.quantity + step;
        const maximum = Math.min(10, item.stock ?? 10);
        if (nextQuantity < 1 || nextQuantity > maximum) return;
        updateQuantity(item.id, nextQuantity);
        setAnnouncement(item.title + ': ' + nextQuantity + ' unidad(es) en el carrito.');
    };

    const removeItem = (item) => {
        removeFromCart(item.id);
        setAnnouncement("Se quitó '" + item.title + "' del carrito.");
    };

    return (
        <>
            <h1 className="page-title">Carrito de compras</h1>
            <div className="contenedor-compra">
                <section className="block cart-products">
                    <h2>Productos seleccionados</h2>
                    <p className="note" aria-live="polite">{announcement}</p>

                    {items.length === 0 ? (
                        <div className="estado-vacio">
                            <h2>Tu carrito está vacío</h2>
                            <p>Aún no has seleccionado ningún libro.</p>
                        </div>
                    ) : (
                        <table className="tabla tabla-carrito">
                            <caption>Resumen del carrito</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Producto</th>
                                    <th scope="col" className="col-precio">Precio</th>
                                    <th scope="col">Cantidad</th>
                                    <th scope="col" className="col-subtotal">Subtotal</th>
                                    <th scope="col">Quitar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="producto-carrito">
                                            <img
                                                src={item.cover}
                                                alt={`Portada del libro ${item.title}`}
                                                width="42"
                                                height="63"
                                            />
                                            <span>{item.title}</span>
                                        </td>
                                        <td className="derecha col-precio">
                                            {formatCurrency(item.price)}
                                        </td>
                                        <td className="centro">
                                            <span className="control-cantidad">
                                                <button
                                                    type="button"
                                                    onClick={() => changeQuantity(item, -1)}
                                                    aria-label={`Quitar una unidad de ${item.title}`}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    −
                                                </button>
                                                <span className="cantidad">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => changeQuantity(item, 1)}
                                                    aria-label={`Agregar una unidad de ${item.title}`}
                                                    disabled={item.quantity >= Math.min(10, item.stock ?? 10)}
                                                >
                                                    +
                                                </button>
                                            </span>
                                        </td>
                                        <td className="derecha col-subtotal">
                                            {formatCurrency(item.price * item.quantity)}
                                        </td>
                                        <td className="centro">
                                            <button
                                                type="button"
                                                className="boton-enlace"
                                                onClick={() => removeItem(item)}
                                                aria-label={`Quitar ${item.title} del carrito`}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th scope="row">Total</th>
                                    <td className="derecha" colSpan="4">
                                        <strong>{formatCurrency(total)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}

                    <p className="actions">
                        <Link className="btn btn-outline" to="/catalog">Continuar comprando</Link>
                    </p>
                </section>

                {items.length > 0 && (
                    <section className="resumen-compra">
                        <h2>Resumen</h2>
                        <ul>
                            <li>Productos: {formatCurrency(total)}</li>
                            <li>Envío: se calculará en el siguiente paso.</li>
                        </ul>
                        {isAuthenticated ? (
                            <p className="actions">
                                <Link className="btn btn-primary" to="/checkout">
                                    Comprar ahora
                                </Link>
                            </p>
                        ) : (
                            <>
                                <h3 className="desktop-only">¿Cómo deseas continuar?</h3>
                                <p className="desktop-only">
                                    No necesitas una cuenta para comprar: puedes finalizar tu pedido
                                    como invitado ingresando tus datos de envío y de pago.
                                </p>
                                <p className="actions">
                                    <Link className="btn btn-primary" to="/checkout">
                                        Comprar como invitado
                                    </Link>
                                    <Link className="btn btn-outline" to="/login">
                                        Iniciar sesión y comprar
                                    </Link>
                                </p>
                            </>
                        )}
                    </section>
                )}
            </div>
        </>
    );
}

export default Cart;
