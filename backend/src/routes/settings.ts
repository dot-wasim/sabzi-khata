import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { setPinSchema, verifyPinSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/settings/pin-status — check if PIN is configured
router.get('/pin-status', authenticate, async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    res.json({
      pinSet: Boolean(settings?.ownerPin),
    });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(500).json({ error: 'Failed to check PIN status' });
  }
});

// POST /api/settings/verify-pin — verify 4-digit PIN for System 3 Boss Desk
router.post('/verify-pin', authenticate, async (req: Request, res: Response) => {
  try {
    const { pin } = verifyPinSchema.parse(req.body);
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

    if (!settings?.ownerPin) {
      // If no PIN is configured, owner can proceed to set one
      return res.json({ valid: true, needsSetup: true });
    }

    const isValid = await bcrypt.compare(pin, settings.ownerPin);
    if (!isValid) {
      return res.status(400).json({ valid: false, error: 'Incorrect 4-digit PIN' });
    }

    res.json({ valid: true, needsSetup: false });
  } catch (error: any) {
    console.error('Error verifying PIN:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// POST /api/settings/set-pin — create or change PIN
router.post('/set-pin', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPin, newPin } = setPinSchema.parse(req.body);
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

    // If PIN already exists, verify currentPin first
    if (settings?.ownerPin) {
      if (!currentPin) {
        return res.status(400).json({ error: 'Current PIN is required to change PIN' });
      }
      const isMatch = await bcrypt.compare(currentPin, settings.ownerPin);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current PIN does not match' });
      }
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: { ownerPin: hashedPin },
      create: { id: 1, ownerPin: hashedPin },
    });

    res.json({ message: 'Owner PIN updated successfully', pinSet: true });
  } catch (error: any) {
    console.error('Error setting PIN:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to set PIN' });
  }
});

export default router;
