import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LABELS } from '../../data/products';
import { storeApi } from '../../services/store-api';
import ProductCard from '../ProductCard/ProductCard';
import './Home.css';

const FEATURED_CATEGORIES = ['men', 'women', 'kids'];

function Home() {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const featuredProducts = useMemo(() => FEATURED_CATEGORIES
        .map((category) => products.find((product) => product.category === category))
        .filter(Boolean), [products]);

    useEffect(() => {
        let active = true;
        storeApi.products()
            .then((data) => {
                if (active) setProducts(data);
            })
            .catch(() => {
                if (active) setError('No se pudieron cargar los libros destacados.');
            });
        return () => {
            active = false;
        };
    }, []);

    return (
        <>

            <section className="block desktop-only">
                <h2>Tu próxima lectura está aquí</h2>
                <p>
                    Encuentra novelas clásicas, historias inolvidables y libros para los
                    lectores más pequeños.
                </p>
                <p className="actions">
                    <Link className="btn btn-primary" to="/catalog">Explorar todos los libros</Link>
                </p>
            </section>

            <section className="block tablet-up">
                <h2>Compra según el público</h2>
                <ul className="pills">
                    {FEATURED_CATEGORIES.map((category) => (
                        <li key={category}>
                            <Link className="pill" to={`/catalog?category=${category}`}>
                                Libros para {CATEGORY_LABELS[category].toLowerCase()}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="products-grid">
                <h2>Libros destacados</h2>
                {error && <p className="note" role="alert">{error}</p>}
                {featuredProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        coverLink={`/catalog?category=${product.category}`}
                    />
                ))}
            </section>

            <section className="block benefits">
                <h2 className="text-short">Nuestros beneficios</h2>
                <h2 className="text-long">Beneficios de comprar con nosotros</h2>
                <ul>
                    <li>Catálogo seleccionado para diferentes lectores.</li>
                    <li>Opciones de entrega a domicilio o recojo en tienda.</li>
                    <li>Pago con tarjeta de crédito o débito.</li>
                    <li>Puedes comprar como invitado, sin crear una cuenta.</li>
                </ul>
            </section>
        </>
    );
}

export default Home;
