import { CATEGORY_LABELS } from '../../data/products';
import './CategoryFilter.css';

function CategoryFilter({ category, onChange }) {
    return (
        <section className="block filters" aria-labelledby="filters-title">
            <h2 id="filters-title">Filtrar productos</h2>
            <p className="text-short">Elige un público:</p>
            <p className="text-long">Selecciona el público que deseas consultar:</p>

            <label className="filter-label" htmlFor="category">Público</label>
            <select
                id="category"
                className="input"
                value={category}
                onChange={(event) => onChange(event.target.value)}
            >
                {Object.keys(CATEGORY_LABELS).map((value) => (
                    <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
                ))}
            </select>
        </section>
    );
}

export default CategoryFilter;
