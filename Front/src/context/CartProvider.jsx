import { useState } from 'react';
import CartContext from './CartContext';

const CART_KEY = 'carritoReact';

export function CartProvider({ children }) {
    const storedItems = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const [items, setItems] = useState(storedItems);

    const saveItems = (nextItems) => {
        setItems(nextItems);
        localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
    };

    const addToCart = (product) => {
        if (product.stock <= 0) {
            return;
        }
        const existingItem = items.find((item) => item.id === product.id);
        const maximum = Math.min(10, product.stock ?? 10);

        if (existingItem) {
            if (existingItem.quantity >= maximum) {
                return;
            }

            saveItems(items.map((item) =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
            return;
        }

        saveItems([...items, { ...product, quantity: 1 }]);
    };

    const removeFromCart = (productId) => {
        saveItems(items.filter((item) => item.id !== productId));
    };

    const updateQuantity = (productId, quantity) => {
        const product = items.find((item) => item.id === productId);
        const maximum = Math.min(10, product?.stock ?? 10);
        if (quantity < 1 || quantity > maximum) {
            return;
        }

        saveItems(items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => {
        saveItems([]);
    };

    const totalCents = items.reduce(
        (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
        0
    );
    const total = totalCents / 100;
    const itemCount = items.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                total,
                itemCount
            }}
        >
            {children}
        </CartContext.Provider>
    );
}
