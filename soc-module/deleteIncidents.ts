import { PrismaClient } from '@prisma/client';
import 'dotenv/config'; // Load environment variables from .env

const prisma = new PrismaClient();

async function deleteIncidents() {
  try {
    console.log('Deleting all Incident records...');
    const { count } = await prisma.incident.deleteMany({});
    console.log(`Deleted ${count} Incident records.`);
  } catch (error) {
    console.error('Error deleting Incident records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteIncidents();
