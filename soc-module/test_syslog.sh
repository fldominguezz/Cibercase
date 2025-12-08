#!/bin/bash
# Script para enviar un mensaje de prueba Syslog UDP al listener del SOC module.

TARGET_IP="127.0.0.1" # Enviamos a localhost, ya que el script se ejecuta en el mismo host que Docker
TARGET_PORT="514"
CEF_MESSAGE="<13>Nov 06 12:00:00 testhost CEF:0|Fortinet|FortiGate|7.0|12345|traffic:forward|5|src=192.168.1.10 dst=8.8.8.8 spt=1234 dpt=53 proto=17 msg='DNS query for google.com'"

echo "Enviando mensaje Syslog a ${TARGET_IP}:${TARGET_PORT}..."
echo "${CEF_MESSAGE}" | nc -u -w0 ${TARGET_IP} ${TARGET_PORT}
echo "Mensaje enviado."
