import { prisma } from '../../config/database';

const SOFT_DELETE_RETENTION_DAYS = 30;
const SYNC_LOG_RETENTION_DAYS = 90;

export async function runGdprCleanup(): Promise<void> {
  const softDeleteCutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const syncLogCutoff = new Date(Date.now() - SYNC_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Hard-delete users soft-deleted more than 30 days ago (DSGVO Art. 17)
  const deleted = await prisma.user.deleteMany({
    where: {
      deletedAt: { lt: softDeleteCutoff, not: null },
    },
  });

  // Prune SyncLog entries older than 90 days to prevent unbounded growth
  const prunedLogs = await prisma.syncLog.deleteMany({
    where: { startedAt: { lt: syncLogCutoff } },
  });

  console.log(`[gdpr-cleanup] hard-deleted ${deleted.count} users, pruned ${prunedLogs.count} sync log entries`);
}
