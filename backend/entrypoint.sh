#!/bin/bash
set -e

# echo "Sincronizando la hora con ntpdate..."

# # Actualizar los repositorios de apt para buster a archive.debian.org
# sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list
# sed -i 's/security.debian.org/archive.debian.org/g' /etc/apt/sources.list

# apt-get update && apt-get install -y ntpdate --no-install-recommends
# ntpdate -u pool.ntp.org
# echo "Hora sincronizada. Nueva hora en el contenedor:"
# date

# Ejecutar el comando principal de la aplicación
exec "$@"

