import { Link, Navigate } from 'react-router-dom';
import { ORDER_KEY } from '../../data/checkoutData';
import './Confirmation.css';

const formatCurrency = (price) => 'S/ ' + Number(price).toFixed(2);

function Confirmation() {
    let order = null;
    try {
        order = JSON.parse(sessionStorage.getItem(ORDER_KEY)) || null;
    } catch {
        sessionStorage.removeItem(ORDER_KEY);
    }

    if (!order) {
        return <Navigate to="/" replace />;
    }

    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const date = new Date(order.createdAt).toLocaleDateString('es-PE');

    return (
        <>
            <h1 className="page-title">Pedido confirmado</h1>
            <section className="block confirmacion">
                <h2>¡Gracias por tu compra!</h2>
                <p>Tu pedido fue registrado correctamente.</p>

                <table className="tabla tabla-datos">
                    <caption>Resumen de confirmación</caption>
                    <tbody>
                        <tr><th scope="row">Número de pedido</th><td>{order.orderNumber}</td></tr>
                        <tr><th scope="row">Fecha</th><td>{date}</td></tr>
                        <tr><th scope="row">Comprador</th><td>{order.buyer.name}</td></tr>
                        {order.items.map((book) => (
                            <tr key={book.productId}>
                                <th scope="row">{book.title} (x{book.quantity})</th>
                                <td>{formatCurrency(book.lineTotal)}</td>
                            </tr>
                        ))}
                        <tr><th scope="row">Cantidad de libros</th><td>{itemCount}</td></tr>
                        <tr>
                            <th scope="row">Total de productos</th>
                            <td>{formatCurrency(order.subtotal)}</td>
                        </tr>
                        <tr><th scope="row">{order.shipping.methodName}</th><td>{formatCurrency(order.shippingCost)}</td></tr>
                        <tr>
                            <th scope="row">Total del pedido</th>
                            <td><strong>{formatCurrency(order.total)}</strong></td>
                        </tr>
                        <tr>
                            <th scope="row">Método de pago</th>
                            <td>{order.payment.brand.toUpperCase()} terminada en {order.payment.lastFour}</td>
                        </tr>
                        <tr><th scope="row">Estado</th><td>Pedido recibido</td></tr>
                    </tbody>
                </table>

                <p>Guarda el número de pedido como referencia de tu compra.</p>
                <p className="actions">
                    <Link className="btn btn-primary" to="/catalog">Seguir comprando</Link>
                    <Link className="btn btn-outline" to="/">Volver al inicio</Link>
                </p>
            </section>

        </>
    );
}

export default Confirmation;
