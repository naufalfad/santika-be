import { prisma } from '../../config/database';
import { SpecialFundStatus } from '@prisma/client';

export const runDailySpecialFundCleanup = async () => {
  console.log('⏰ Running scheduled check for expired Special Funds...');
  try {
    const today = new Date();
    
    // Find all active Special Funds that have exceeded their end date
    const expiredFunds = await prisma.specialFund.findMany({
      where: {
        status: SpecialFundStatus.AKTIF,
        tanggalSelesai: {
          lt: today,
        },
      },
    });

    if (expiredFunds.length === 0) {
      console.log('✅ No expired Special Funds found today.');
      return;
    }

    // Find a system user (first SUPER_ADMIN) to act as the audit log actor
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    
    const fallbackUser = await prisma.user.findFirst();
    const systemActorId = adminUser?.id || fallbackUser?.id;

    if (!systemActorId) {
      console.warn('⚠️ No users found in database. Audit log creation for auto-closed funds will be skipped.');
    }

    for (const fund of expiredFunds) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.specialFund.update({
          where: { id: fund.id },
          data: { status: SpecialFundStatus.DITUTUP },
        });

        if (systemActorId) {
          await tx.auditLog.create({
            data: {
              type: 'SPECIAL_FUND',
              action: `Sistem menutup Dana Khusus otomatis (Periode Selesai): ${updated.name} (${updated.code})`,
              actorId: systemActorId,
              parokiId: fund.parokiId,
              oldData: JSON.parse(JSON.stringify(fund)),
              newData: JSON.parse(JSON.stringify(updated)),
            },
          });
        }
      });
      console.log(`🔒 Special Fund ${fund.name} (${fund.code}) has been closed automatically.`);
    }
  } catch (error) {
    console.error('❌ Error in daily Special Fund cleanup scheduler:', error);
  }
};

/**
 * Initializes the automated job scheduler.
 * Runs check immediately on server start, and schedules it for every 24 hours.
 */
export const initSpecialFundScheduler = () => {
  // Execute immediately on startup
  runDailySpecialFundCleanup();

  // Run every 24 hours
  setInterval(runDailySpecialFundCleanup, 24 * 60 * 60 * 1000);
};
