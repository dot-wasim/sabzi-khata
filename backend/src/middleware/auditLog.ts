import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAudit(
  userId: number,
  action: string,
  entity: string,
  entityId: number,
  before: unknown | null,
  after: unknown | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
