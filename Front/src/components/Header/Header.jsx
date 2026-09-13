import { Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import './Header.css';

function Header({ menus }) {
    return (
        <header className="header">
            <Link to="/" className="brand link-unstyled">Entre Páginas</Link>
            <Navbar menus={menus} />
        </header>
    );
}

export default Header;
