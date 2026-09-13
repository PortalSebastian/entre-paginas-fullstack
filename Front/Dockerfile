# Imagen base oficial de Node.js en su variante Alpine (ligera).
# Vite 8 exige Node 20.19+ o 22.12+, por eso se parte de la rama 22.
FROM node:22-alpine

# Carpeta de trabajo: desde aquí Docker ejecuta todas las instrucciones.
WORKDIR /app

# La imagen oficial trae el usuario sin privilegios "node". Se le entrega la
# carpeta de trabajo para que la aplicación no se ejecute como root.
RUN chown node:node /app
USER node

# Primero solo los manifiestos de dependencias: si cambia el código pero no
# las dependencias, Docker reutiliza la capa cacheada de "npm ci".
COPY --chown=node:node package*.json ./
RUN npm ci

# Luego el resto del código fuente (lo excluido está en .dockerignore).
COPY --chown=node:node . .

# URL del backend que consume el front. Las peticiones las hace el navegador
# del host, así que localhost:3000 apunta al backend que corre en el host.
ENV VITE_API_URL=http://localhost:3000/api/v1

# Puerto por defecto del servidor de desarrollo de Vite.
EXPOSE 5173

# Proceso principal del contenedor: el servidor de desarrollo de Vite.
# "--host 0.0.0.0" hace que escuche en todas las interfaces; sin eso solo
# atiende dentro del contenedor y el puerto publicado no respondería.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
