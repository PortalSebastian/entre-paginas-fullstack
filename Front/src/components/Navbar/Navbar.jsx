import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import './Navbar.css';

function Navbar({ menus }) {
    const { user, isAuthenticated, logout } = useAuth();
    const { itemCount } = useCart();

    return (
        <nav className="navbar" aria-label="Navegación principal">
            <ul>
                {menus.map((menu) => {
                    const isSessionLink = menu.path === '/login' || menu.path === '/register';

                    if (isAuthenticated && isSessionLink) {
                        return null;
                    }

                    return (
                        <li key={menu.id}>
                            <Link to={menu.path}>
                                {menu.name}
                                {menu.path === '/cart' && itemCount > 0 && (
                                    <span className="cart-badge">{itemCount}</span>
                                )}
                            </Link>
                        </li>
                    );
                })}
                {isAuthenticated && (
                    <li className="sesion-usuario">
                        <span className="saludo-usuario">Hola, {user.firstName}</span>
                        <button type="button" className="enlace-sesion" onClick={() => void logout()}>
                            Cerrar sesión
                        </button>
                    </li>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;
