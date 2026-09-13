import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import Button from '../shared/Button/Button';
import './ProductCard.css';

const formatCurrency = (price) => 'S/ ' + Number(price).toFixed(2);

function ProductCard({ product, coverLink }) {
    const { addToCart } = useCart();
    const cover = (
        <img
            src={product.cover}
            alt={`Portada del libro ${product.title}`}
            width="140"
            height="210"
        />
    );

    return (
        <article className="card product-card">
            <figure>
                {coverLink ? (
                    <Link to={coverLink} className="cover-link">{cover}</Link>
                ) : (
                    cover
                )}
                <p className="product-price-badge">{formatCurrency(product.price)}</p>
            </figure>

            <h3 className="product-title">{product.title}</h3>
            <p className="product-author">{product.author}</p>

            <p className="product-description text-short">{product.shortDescription}</p>
            <p className="product-description text-long">{product.description}</p>

            <ul>
                <li><strong>Género:</strong> {product.genre}</li>
                <li><strong>Formato:</strong> {product.format}</li>
            </ul>

            <p className="product-price"><strong>Precio:</strong> {formatCurrency(product.price)}</p>
            {!coverLink && (
                <p className="product-stock">
                    {product.stock > 0 ? `Disponibles: ${product.stock}` : 'Agotado'}
                </p>
            )}

            {!coverLink && (
                <p className="product-actions">
                    <Button disabled={product.stock <= 0} onClick={() => addToCart(product)}>
                        {product.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                    </Button>
                </p>
            )}
        </article>
    );
}

export default ProductCard;
