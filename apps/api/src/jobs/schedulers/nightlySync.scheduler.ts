import { prisma } from '../../config/database';
import { syncQueue, SyncJobData } from '../processors/sync.processor';
import { budgetAlertQueue } from '../processors/budgetAlert.processor';
import { SyncStatus } from '@finanzapp/types';

// Runs nightly at 03:00 Europe/Berlin — enqueues sync + budget alert jobs for all active connections
export async function scheduleNightlySync(): Promise<void> {
  const connections = await prisma.bankConnection.findMany({
    where: {
      isActive: true,
      syncStatus: { notIn: [SyncStatus.SYNCING] },
    },
    select: { id: true, userId: true },
  });

  const userIds = [...new Set(connections.map((c) => c.userId))];

  for (const conn of connections) {
    await syncQueue.add({ bankConnectionId: conn.id } satisfies SyncJobData, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  for (const userId of userIds) {
    await budgetAlertQueue.add({ userId }, {
      attempts: 2,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  console.log(`[scheduler] nightly sync enqueued: ${connections.length} connections, ${userIds.length} budget checks`);
}
