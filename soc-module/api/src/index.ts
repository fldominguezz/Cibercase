import 'dotenv/config'; // Load environment variables
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Fallback for development

// Middleware
app.use(cors());
app.use(express.json());

// --- Authentication and Authorization ---

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send('Access denied.');
    }
    next();
  };
};

// --- Routes ---

app.get('/', (req, res) => {
  res.send('SOC API Service is running!');
});

app.get('/api/', (req, res) => {
  res.send('SOC API Service (via Caddy) is running!');
});

// User Registration
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).send('Missing required fields.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
      },
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering user.');
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Missing email or password.');
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).send('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid credentials.');
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in.');
  }
});

// --- Protected Routes (Example) ---

app.get('/profile', authenticateToken, (req: AuthRequest, res) => {
  res.json(req.user);
});

// Admin: Get all users
app.get('/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, mfaEnabled: true, disabled: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching users.');
  }
});

// Admin: Create user (similar to register, but for admin panel)
app.post('/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).send('Missing required fields.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role,
      },
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user.');
  }
});

// Admin: Update user role/status
app.put('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, mfaEnabled, disabled } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email, role, mfaEnabled, disabled },
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled, disabled: user.disabled });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating user.');
  }
});

// Admin: Delete user
app.delete('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting user.');
  }
});


app.listen(port, () => {
  console.log(`SOC API Service listening on port ${port}`);
});
