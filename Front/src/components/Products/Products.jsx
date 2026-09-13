import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storeApi } from '../../services/store-api';
import CategoryFilter from '../CategoryFilter/CategoryFilter';
import ProductCard from '../ProductCard/ProductCard';
import './Products.css';
function Products() {
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') || 'all';
    const [catalogState, setCatalogState] = useState({
        category: null,
        products: [],
        error: '',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchState, setSearchState] = useState(null);
    const isLoading = catalogState.category !== category;
    const products = isLoading ? [] : catalogState.products;
    const error = isLoading ? '' : catalogState.error;

    useEffect(() => {
        let active = true;
        storeApi.products(category)
            .then((data) => {
                if (active) {
                    setCatalogState({ category, products: data, error: '' });
                }
            })
            .catch(() => {
                if (active) {
                    setCatalogState({
                        category,
                        products: [],
                        error: 'No se pudo cargar el catálogo. Comprueba que el backend esté disponible.',
                    });
                }
            });
        return () => {
            active = false;
        };
    }, [category]);

    const handleCategoryChange = (value) => {
        setSearchParams(value === 'all' ? {} : { category: value });
        setSearchState(null);
        setSearchTerm('');
    };

    // La busqueda llega al backend como parametro ligado de una consulta SQL.
    // Escribir aqui un payload de inyeccion devuelve cero resultados: el motor
    // lo trata como texto a buscar, no como sintaxis.
    const handleSearch = (event) => {
        event.preventDefault();
        const term = searchTerm.trim();
        if (!term) {
            setSearchState(null);
            return;
        }
        setSearchState({ term, products: [], error: '', loading: true });
        storeApi.search(term)
            .then((data) => setSearchState({ term, products: data, error: '', loading: false }))
            .catch((apiError) => setSearchState({
                term,
                products: [],
                error: apiError.status === 422
                    ? 'Escribe entre 1 y 100 caracteres para buscar.'
                    : 'No se pudo completar la búsqueda.',
                loading: false,
            }));
    };

    const visibleProducts = searchState ? searchState.products : products;
    const visibleError = searchState ? searchState.error : error;
    const showingSearch = searchState !== null;

    return (
        <>
            <h1 className="page-title with-tagline">Catálogo de libros</h1>
            <p className="tagline">Elige una historia para tu próxima aventura.</p>

            <CategoryFilter category={category} onChange={handleCategoryChange} />

            <form className="product-search" onSubmit={handleSearch} role="search">
                <label className="visually-hidden" htmlFor="product-search-input">
                    Buscar por título o autor
                </label>
                <input
                    id="product-search-input"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por título o autor…"
                    maxLength={100}
                />
                <button type="submit">Buscar</button>
                {showingSearch && (
                    <button
                        type="button"
                        className="secondary"
                        onClick={() => { setSearchState(null); setSearchTerm(''); }}
                    >
                        Limpiar
                    </button>
                )}
            </form>

            <p className="note" aria-live="polite">
                {showingSearch
                    ? (searchState.loading
                        ? 'Buscando…'
                        : `Resultados para «${searchState.term}»: ${searchState.products.length} libros.`)
                    : isLoading ? 'Cargando libros…' : `Selección actual: ${products.length} libros.`}
            </p>

            {visibleError ? (
                <p className="empty-products" role="alert">{visibleError}</p>
            ) : showingSearch && !searchState.loading && visibleProducts.length === 0 ? (
                <p className="empty-products">
                    No se encontraron libros que coincidan con «{searchState.term}».
                </p>
            ) : !showingSearch && !isLoading && products.length === 0 ? (
                <p className="empty-products">
                    No se encontraron libros para el público seleccionado.
                </p>
            ) : (showingSearch ? !searchState.loading : !isLoading) && (
                <section className="products-grid">
                    {visibleProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </section>
            )}
        </>
    );
}

export default Products;
