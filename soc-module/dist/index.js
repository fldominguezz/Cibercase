"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto = __importStar(require("crypto")); // Importar todo como crypto
const dgram_1 = __importDefault(require("dgram")); // Para Syslog UDP
const xml2js_1 = require("xml2js"); // Importar parseStringPromise de xml2js
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'supersecretkey';
const SYSLOG_PORT = parseInt(process.env.SYSLOG_PORT || '514', 10);
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('SOC Module API is running!');
});
// Ruta de prueba para crear un usuario
app.post('/users', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Faltan campos requeridos: name, email, password, role' });
    }
    try {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword,
                role,
            },
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'No se pudo crear el usuario' });
    }
});
// Ruta de prueba para obtener todos los usuarios
app.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    }
    catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'No se pudieron obtener los usuarios' });
    }
});
// Nueva ruta para obtener todos los eventos raw
app.get('/events/raw', async (req, res) => {
    try {
        const rawEvents = await prisma.eventRaw.findMany();
        res.json(rawEvents);
    }
    catch (error) {
        console.error('Error al obtener eventos raw:', error);
        res.status(500).json({ error: 'No se pudieron obtener los eventos raw' });
    }
});
// Endpoint para ingesta de webhooks (ej. FortiGate Automation Stitches)
app.post('/ingest/webhook', async (req, res) => {
    const signature = req.headers['x-fortigate-signature'] || req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    if (!signature || digest !== signature) {
        console.warn('Webhook: Firma inválida o faltante.');
        return res.status(401).json({ error: 'Firma de webhook inválida o faltante.' });
    }
    try {
        const eventRaw = await prisma.eventRaw.create({
            data: {
                source: 'webhook',
                payload_jsonb: req.body,
                sig_sha256: signature,
            },
        });
        console.log('Webhook recibido y guardado:', eventRaw.id);
        res.status(200).json({ message: 'Webhook recibido y procesado', eventId: eventRaw.id });
    }
    catch (error) {
        console.error('Error al procesar webhook:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar webhook.' });
    }
});
// Syslog UDP Listener
const syslogServer = dgram_1.default.createSocket('udp4');
syslogServer.on('error', (err) => {
    console.error(`Syslog server error:\n${err.stack}`);
    syslogServer.close();
});
syslogServer.on('message', async (msg, rinfo) => {
    console.log(`Syslog recibido de ${rinfo.address}:${rinfo.port}: ${msg}`);
    const rawLog = msg.toString();
    // --- Lógica de Parsing y Normalización (inicial) ---
    let parsedPayload = { raw_message: rawLog, sender_ip: rinfo.address };
    let source = 'syslog';
    let description = 'No hay descripción detallada.';
    // Detección básica de formatos (CEF, LEEF, JSON, XML)
    if (rawLog.includes('CEF:')) {
        source = 'syslog-cef';
        // Aquí iría un parser CEF más sofisticado
        parsedPayload.format = 'CEF';
    }
    else if (rawLog.includes('LEEF:')) {
        source = 'syslog-leef';
        // Aquí iría un parser LEEF más sofisticado
        parsedPayload.format = 'LEEF';
    }
    else if (rawLog.startsWith('{') && rawLog.endsWith('}')) {
        try {
            parsedPayload = JSON.parse(rawLog);
            source = 'syslog-json';
        }
        catch (e) {
            // No es JSON válido, se mantiene como texto plano
        }
    }
    else if (rawLog.trim().startsWith('<incident')) {
        try {
            const result = await (0, xml2js_1.parseStringPromise)(rawLog);
            const incident = result.incident;
            const incidentId = incident.$.incidentId;
            const severity = incident.$.severity;
            const ruleName = incident.name[0];
            const incidentDescription = incident.description[0];
            const displayTime = incident.displayTime[0];
            const srcIpAddr = incident.incidentSource[0].entry[0].$.attribute === 'srcIpAddr' ? incident.incidentSource[0].entry[0]._ : 'N/A';
            const destIpAddr = incident.incidentTarget[0].entry[0].$.attribute === 'destIpAddr' ? incident.incidentTarget[0].entry[0]._ : 'N/A';
            const attackName = incident.incidentDetails[0].entry.find((e) => e.$.attribute === 'attackName')?._ || 'N/A';
            const signatureId = incident.incidentDetails[0].entry.find((e) => e.$.attribute === 'ipsSignatureId')?._ || 'N/A';
            description = `
**ID de Incidente FortiSIEM:** ${incidentId}
**Severidad FortiSIEM:** ${severity}
**Regla Disparada:** ${ruleName}
**Fecha/Hora del Incidente:** ${displayTime}
**IP Origen:** ${srcIpAddr}
**IP Destino:** ${destIpAddr}
**Nombre del Ataque:** ${attackName}
**ID de Firma IPS:** ${signatureId}

-----------------------------------------
**Descripción del Evento:**
${incidentDescription}
`;
            parsedPayload = {
                ...parsedPayload,
                fortisiem: {
                    incidentId,
                    severity,
                    ruleName,
                    incidentDescription,
                    displayTime,
                    srcIpAddr,
                    destIpAddr,
                    attackName,
                    signatureId,
                },
                description_formatted: description,
            };
            source = 'syslog-fortisiem-xml';
        }
        catch (e) {
            console.error('Error al parsear XML de FortiSIEM:', e);
            // Si falla el parseo XML, se mantiene como texto plano
        }
    }
    // --- Fin Lógica de Parsing y Normalización ---
    try {
        const eventRaw = await prisma.eventRaw.create({
            data: {
                source: source,
                payload_jsonb: parsedPayload,
                // sig_sha256 no aplica directamente para syslog UDP sin firma
            },
        });
        console.log('Syslog event guardado:', eventRaw.id);
    }
    catch (error) {
        console.error('Error al guardar evento Syslog:', error);
    }
});
syslogServer.on('listening', () => {
    const address = syslogServer.address();
    console.log(`Syslog UDP server listening on ${address.address}:${address.port}`);
});
syslogServer.bind(SYSLOG_PORT);
app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
});
