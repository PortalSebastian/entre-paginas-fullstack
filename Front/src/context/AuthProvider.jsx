import { useEffect, useState } from 'react';
import AuthContext from './AuthContext';
import { api } from '../services/api';
import { storeApi } from '../services/store-api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        localStorage.removeItem('usuariosReact');
        localStorage.removeItem('usuarioActivoReact');
        api.setSessionListener((session) => {
            if (active) setUser(session?.user ?? null);
        });
        storeApi.refresh()
            .then((session) => {
                if (active) setUser(session.user);
            })
            .catch(() => {
                api.clearAccessToken();
                if (active) setUser(null);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
            api.setSessionListener(null);
        };
    }, []);

    const register = (formData) => storeApi.register(formData);

    const login = async (email, password) => {
        const session = await storeApi.login(email, password);
        setUser(session.user);
        return session.user;
    };

    const logout = async () => {
        await storeApi.logout().catch(() => undefined);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, register, login, logout, isAuthenticated: user !== null, isLoading }}
        >
            {children}
        </AuthContext.Provider>
    );
}
