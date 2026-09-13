import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { CartProvider } from './context/CartProvider';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './components/Home/Home';
import Products from './components/Products/Products';
import Cart from './components/Cart/Cart';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import Checkout from './components/Checkout/Checkout';
import Confirmation from './components/Confirmation/Confirmation';

const NAVBAR_MENUS = [
    { id: 1, path: '/', name: 'Inicio' },
    { id: 2, path: '/catalog', name: 'Catálogo' },
    { id: 3, path: '/cart', name: 'Carrito' },
    { id: 4, path: '/login', name: 'Iniciar sesión' },
    { id: 5, path: '/register', name: 'Registrarse' }
];

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <Header menus={NAVBAR_MENUS} />
                    <main className="container">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/catalog" element={<Products />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/confirmation" element={<Confirmation />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                    <Footer />
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
