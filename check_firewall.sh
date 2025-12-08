#!/bin/bash

echo "--- Verificando el estado de UFW (Uncomplicated Firewall) ---"
sudo ufw status verbose
echo ""

echo "--- Listando reglas de UFW ---"
sudo ufw show added
echo ""

echo "--- Mostrando las últimas 50 líneas de logs relacionadas con UFW ---"
# Intenta leer de syslog, si no existe, intenta con journalctl
if [ -f "/var/log/syslog" ]; then
    grep -i "UFW" /var/log/syslog | tail -n 50
else
    echo "No se encontró /var/log/syslog. Intentando con journalctl..."
    sudo journalctl -u ufw --since "1 hour ago" --no-pager | tail -n 50
fi
echo ""

echo "--- Fin del reporte de firewall ---"
echo "Si ves bloqueos, considera añadir una regla para permitir el tráfico o deshabilitar UFW temporalmente."
echo "Para deshabilitar UFW temporalmente: sudo ufw disable"
echo "Para añadir una regla (ejemplo para puerto 8000): sudo ufw allow 8000"
echo "Recuerda volver a habilitar UFW si lo deshabilitas: sudo ufw enable"
