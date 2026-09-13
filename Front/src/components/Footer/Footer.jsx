import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <section className="footer-block">
                <h2>Enlaces</h2>
                <ul>
                    <li><Link to="/">Inicio</Link></li>
                    <li><Link to="/catalog">Catálogo</Link></li>
                    <li><Link to="/cart">Carrito</Link></li>
                </ul>
            </section>
        </footer>
    );
}

export default Footer;
