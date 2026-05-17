import Bull from 'bull';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { SyncStatus, ConnectorType } from '@finanzapp/types';
import { syncTransactions as fintsSyncTransactions } from '../../services/fints.service';
import { syncTransactions as paypalSyncTransactions } from '../../services/paypal.service';
import { syncTransactions as wiseSyncTransactions } from '../../services/wise.service';
import { syncTransactions as revolutSyncTransactions } from '../../services/revolut.service';
import { syncTransactions as gocardlessSyncTransactions } from '../../services/gocardless.service';
import { syncTransactions as saltedgeSyncTransactions } from '../../services/saltedge.service';

export const syncQueue = new Bull('bank-sync', { createClient: () => redis });

export interface SyncJobData {
  bankConnectionId: string;
}

async function syncConnection(bankConnectionId: string): Promise<void> {
  const conn = await prisma.bankConnection.findUnique({ where: { id: bankConnectionId } });
  if (!conn || !conn.isActive) return;

  switch (conn.connectorType) {
    case ConnectorType.FINTS:       return fintsSyncTransactions(bankConnectionId);
    case ConnectorType.PAYPAL:      return paypalSyncTransactions(bankConnectionId);
    case ConnectorType.WISE:        return wiseSyncTransactions(bankConnectionId);
    case ConnectorType.REVOLUT:     return revolutSyncTransactions(bankConnectionId);
    case ConnectorType.GOCARDLESS:  return gocardlessSyncTransactions(bankConnectionId);
    case ConnectorType.SALTEDGE:    return saltedgeSyncTransactions(bankConnectionId);
  }
}

syncQueue.process(async (job) => {
  const { bankConnectionId } = job.data as SyncJobData;
  await syncConnection(bankConnectionId);
});

syncQueue.on('failed', (job, err) => {
  console.error(`[sync-queue] job ${job.id} failed for connection ${job.data.bankConnectionId}:`, err.message);
});
