import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as dgram from 'dgram';
import * as net from 'net';

const prisma = new PrismaClient();

// --- Syslog UDP Server ---
const udpServer = dgram.createSocket('udp4');

udpServer.on('error', (err) => {
  console.error(`UDP Syslog server error:\n${err.stack}`);
  udpServer.close();
});

udpServer.on('message', async (msg, rinfo) => {
  console.log(`UDP Syslog message from ${rinfo.address}:${rinfo.port}: ${msg}`);
  await processSyslogMessage(msg.toString(), rinfo.address);
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log(`UDP Syslog server listening ${address.address}:${address.port}`);
});

udpServer.bind(514);

// --- Syslog TCP Server ---
const tcpServer = net.createServer((socket) => {
  socket.on('data', async (data) => {
    console.log(`TCP Syslog message from ${socket.remoteAddress}:${socket.remotePort}: ${data}`);
    await processSyslogMessage(data.toString(), socket.remoteAddress || 'unknown');
  });

  socket.on('error', (err) => {
    console.error(`TCP Syslog socket error from ${socket.remoteAddress}:${socket.remotePort}: ${err.message}`);
  });
});

tcpServer.on('error', (err) => {
  console.error(`TCP Syslog server error: ${err.message}`);
});

tcpServer.listen(514, () => {
  const address = tcpServer.address() as net.AddressInfo;
  console.log(`TCP Syslog server listening ${address.address}:${address.port}`);
});

// --- Syslog Message Processing ---
async function processSyslogMessage(rawMessage: string, remoteAddress: string) {
  try {
    // Basic RFC 3164 parsing (simplified)
    // Example: <PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
    const regex = /<(\d+)>(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\s+(\d{2}:\d{2}:\d{2})\s+([\w\d\.-]+)\s+([^:]+):\s+(.*)/;
    const match = rawMessage.match(regex);

    let parsedMessage: any = {
      raw: rawMessage,
      source: remoteAddress,
      receivedAtUtc: new Date(),
    };

    if (match) {
      const priority = parseInt(match[1], 10);
      const facility = Math.floor(priority / 8);
      const severity = priority % 8;
      const month = match[2];
      const day = parseInt(match[3], 10);
      const time = match[4];
      const hostname = match[5];
      const tag = match[6];
      const message = match[7];

      // Construct a date (year is current year, adjust if message is from previous year)
      const currentYear = new Date().getFullYear();
      const dateString = `${month} ${day}, ${currentYear} ${time} UTC`; // Assuming UTC for simplicity
      const timestamp = new Date(dateString);

      parsedMessage = {
        ...parsedMessage,
        priority,
        facility,
        severity,
        month,
        day,
        time,
        hostname,
        tag,
        message,
        timestamp,
      };
    } else {
      // Fallback for unparsed messages
      parsedMessage.message = rawMessage;
      parsedMessage.hostname = remoteAddress;
      parsedMessage.tag = 'unparsed';
      parsedMessage.severity = 6; // Informational
      parsedMessage.facility = 1; // User-level messages
    }

    await prisma.eventRaw.create({
      data: {
        source: parsedMessage.hostname,
        payload: parsedMessage,
        receivedAtUtc: new Date(),
        // sigSha256 will be calculated later if needed
      },
    });
    console.log('Syslog message stored in EventRaw:', parsedMessage.hostname);
  } catch (error: unknown) {
    console.error('Error processing Syslog message:', error instanceof Error ? error.message : error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Syslog servers...');
  udpServer.close();
  tcpServer.close();
  await prisma.$disconnect();
  console.log('Syslog servers shut down gracefully.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Syslog servers...');
  udpServer.close();
  tcpServer.close();
  await prisma.$disconnect();
  console.log('Syslog servers shut down gracefully.');
  process.exit(0);
});