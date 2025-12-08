import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto'; // Importar todo como crypto
import dgram from 'dgram'; // Para Syslog UDP
import { parseStringPromise } from 'xml2js'; // Importar parseStringPromise de xml2js

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'supersecretkey';
const SYSLOG_PORT = parseInt(process.env.SYSLOG_PORT || '514', 10);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('SOC Module API is running!');
});

// Ruta de prueba para crear un usuario
app.post('/users', async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Faltan campos requeridos: name, email, password, role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

// Ruta de prueba para obtener todos los usuarios
app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'No se pudieron obtener los usuarios' });
  }
});

// Nueva ruta para obtener todos los eventos raw
app.get('/events/raw', async (req: Request, res: Response) => {
  try {
    const rawEvents = await prisma.eventRaw.findMany({
      orderBy: {
        received_at_utc: 'desc', // Ordenar por más recientes a más antiguos
      },
    });
    res.json(rawEvents);
  } catch (error) {
    console.error('Error al obtener eventos raw:', error);
    res.status(500).json({ error: 'No se pudieron obtener los eventos raw' });
  }
});

// Endpoint para ingesta de webhooks (ej. FortiGate Automation Stitches)
app.post('/ingest/webhook', async (req: Request, res: Response) => {
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
        sig_sha256: signature as string,
      },
    });
    console.log('Webhook recibido y guardado:', eventRaw.id);
    res.status(200).json({ message: 'Webhook recibido y procesado', eventId: eventRaw.id });
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar webhook.' });
  }
});

// Mapea severidad numérica de FortiSIEM a etiqueta
function mapSeverity(numStr: string | undefined) {
  const n = Number(numStr);
  if (Number.isNaN(n)) return 'UNKNOWN';
  if (n >= 9) return 'Critical';
  if (n >= 7) return 'High';
  if (n >= 4) return 'Medium';
  if (n >= 1) return 'Low';
  return 'UNKNOWN';
}

// Busca el primer <entry ...> con name="Source IP" y devuelve su texto
function findSourceIP(incident: any) {
  const src = incident.incidentSource?.[0];
  const entries = src?.entry || [];
  for (const e of entries) {
    const name = e?.$?.name || e?.$?.attribute || '';
    const val = e?.['#text'] || e?._ || null; // Prefer #text for content
    if (String(name).toLowerCase().includes('source ip')) return val || 'N/A';
  }
  return 'N/A';
}

// Devuelve primer valor de incidentDetails (ej. categoría web)
function findWebCategory(incident: any) {
  const det = incident.incidentDetails?.[0];
  const entries = det?.entry || [];
  for (const e of entries) {
    const name = e?.$?.name || '';
    const val = e?.['#text'] || e?._ || null;
    if (String(name).toLowerCase().includes('category')) return val || 'N/A';
  }
  return 'N/A';
}

// Extrae texto de un nodo simple (name, description, remediation, mitre, etc.)
function textOf(node: any) {
  if (!node) return 'N/A';
  if (Array.isArray(node)) return textOf(node[0]);
  if (typeof node === 'string') return node;
  if (node['#text']) return node['#text']; // Prefer #text for content
  if (node._) return node._;
  return 'N/A';
}


// Syslog UDP Listener
const syslogServer = dgram.createSocket('udp4');

syslogServer.on('error', (err) => {
  console.error(`Syslog server error:\n${err.stack}`);
  syslogServer.close();
});

syslogServer.on('message', async (msg, rinfo) => {
  let rawLog = msg.toString();

  // --- Lógica de Parsing y Normalización (inicial) ---
  let parsedPayload: any = { raw_message: rawLog, sender_ip: rinfo.address };
  let source = 'syslog';
  let description = 'No hay descripción detallada.';
  let extractedRawEvents = '';

  let fortisiemIncidentId: string | null = null;
  let fortisiemSeverity: string | null = null;
  let fortisiemRuleName: string | null = null;
  let fortisiemSrcIp: string | null = null;

  // Detección básica de formatos (CEF, LEEF, JSON, XML)
  if (rawLog.includes('CEF:')) {
    source = 'syslog-cef';
    // Aquí iría un parser CEF más sofisticado
    parsedPayload.format = 'CEF';
  } else if (rawLog.includes('LEEF:')) {
    source = 'syslog-leef';
    // Aquí iría un parser LEEF más sofisticado
    parsedPayload.format = 'LEEF';
    // ... (otros formatos)
  } else if (rawLog.startsWith('{') && rawLog.endsWith('}')) {
    try {
      parsedPayload = JSON.parse(rawLog);
      source = 'syslog-json';
    } catch (e) {
      // No es JSON válido, se mantiene como texto plano
    }
  } else if (rawLog.trim().startsWith('<incident')) {
    try {
      // Manually extract rawEvents content and remove the block from rawLog
      const rawEventsMatch = rawLog.match(/<rawEvents>([\s\S]*?)<\/rawEvents>/);
      if (rawEventsMatch && rawEventsMatch[1]) {
        extractedRawEvents = rawEventsMatch[1].trim();
        rawLog = rawLog.replace(rawEventsMatch[0], ''); // Remove the entire rawEvents block
      }

      const parsed = await parseStringPromise(rawLog, { explicitArray: true, explicitCharkey: true });
      const inc = parsed?.incident;

      if (!inc || !inc.$) {
        console.error('No se encontró nodo <incident> o atributos en el XML');
        source = 'syslog-xml-malformed';
      } else {
        const id = inc.$.incidentId || null;
        const ruleType = inc.$.ruleType || null;
        const severityNum = inc.$.severity || null;
        const severityLbl = mapSeverity(severityNum);

        const name = textOf(inc.name);
        const descriptionInc = textOf(inc.description);
        const remediation = textOf(inc.remediation);

        const sourceIp = findSourceIP(inc);
        const webCategory = findWebCategory(inc);

        const mitreTactic = textOf(inc.mitreTactic);
        const mitreTechniqueId = textOf(inc.mitreTechniqueId);
        const displayTime = textOf(inc.displayTime);
        const category = textOf(inc.incidentCategory);

        // Populate fortisiem-specific fields
        fortisiemIncidentId = id;
        fortisiemSeverity = severityNum;
        fortisiemRuleName = name || ruleType; // Prefer name, fallback to ruleType
        fortisiemSrcIp = sourceIp;
        
        // Build description string, filtering out null/N/A
        const descriptionParts: string[] = [];
        if (id && id !== 'N/A') descriptionParts.push(`**ID de Incidente FortiSIEM:** ${id}`);
        if (severityNum && severityNum !== 'N/A') descriptionParts.push(`**Severidad FortiSIEM:** ${severityLbl} (${severityNum})`);
        if (fortisiemRuleName && fortisiemRuleName !== 'N/A') descriptionParts.push(`**Regla Disparada:** ${fortisiemRuleName} (${ruleType})`);
        if (displayTime && displayTime !== 'N/A') descriptionParts.push(`**Fecha/Hora del Incidente:** ${displayTime}`);
        if (sourceIp && sourceIp !== 'N/A') descriptionParts.push(`**IP Origen:** ${sourceIp}`);
        // Add other fields if they exist and are not N/A
        const destIpAddr = textOf(inc.incidentTarget?.[0]?.entry?.[0]?._);
        if (destIpAddr && destIpAddr !== 'N/A') descriptionParts.push(`**IP Destino:** ${destIpAddr}`);
        const attackName = textOf(inc.incidentDetails?.[0]?.entry?.find((e: any) => e.$.attribute === 'attackName'));
        if (attackName && attackName !== 'N/A') descriptionParts.push(`**Nombre del Ataque:** ${attackName}`);
        const signatureId = textOf(inc.incidentDetails?.[0]?.entry?.find((e: any) => e.$.attribute === 'ipsSignatureId'));
        if (signatureId && signatureId !== 'N/A') descriptionParts.push(`**ID de Firma IPS:** ${signatureId}`);

        if (descriptionInc && descriptionInc !== 'N/A') {
          descriptionParts.push('\n-----------------------------------------');
          descriptionParts.push('**Descripción del Evento:**');
          descriptionParts.push(descriptionInc);
        }
        if (remediation && remediation !== 'N/A') {
          descriptionParts.push('\n**Remediación sugerida:**');
          descriptionParts.push(remediation);
        }
        if ((mitreTactic && mitreTactic !== 'N/A') || (mitreTechniqueId && mitreTechniqueId !== 'N/A')) {
          descriptionParts.push('\n**MITRE:**');
          if (mitreTactic && mitreTactic !== 'N/A') descriptionParts.push(`Táctica: ${mitreTactic}`);
          if (mitreTechniqueId && mitreTechniqueId !== 'N/A') descriptionParts.push(`Técnicas: ${mitreTechniqueId}`);
        }
        if (extractedRawEvents && extractedRawEvents !== 'N/A') {
          descriptionParts.push('\n**Raw Events:**');
          descriptionParts.push(extractedRawEvents);
        }

        description = descriptionParts.join('\n').trim();


        parsedPayload = {
          ...parsedPayload,
          fortisiem: {
            id,
            rule_type: ruleType,
            name,
            severity_num: severityNum,
            severity_label: severityLbl,
            description: descriptionInc,
            remediation,
            mitre_tactic: mitreTactic,
            mitre_technique_id: mitreTechniqueId,
            display_time: textOf(inc.displayTime),
            category: textOf(inc.incidentCategory),
            affected: {
              source_ip: sourceIp,
              web_category: webCategory,
            },
            raw_events: extractedRawEvents,
          },
          description_formatted: description,
        };
        source = 'syslog-fortisiem-xml';
      }
    } catch (e) {
      console.error('Error al parsear FortiSIEM XML:', e);
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
        fortisiem_incident_id: fortisiemIncidentId,
        fortisiem_severity: fortisiemSeverity,
        fortisiem_rule_name: fortisiemRuleName,
        fortisiem_src_ip: fortisiemSrcIp,
      },
    });
    console.log('Syslog event guardado:', eventRaw.id);
  } catch (error) {
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
