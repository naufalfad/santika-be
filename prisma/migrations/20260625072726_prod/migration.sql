-- AlterTable
ALTER TABLE "CashTransaction" ADD COLUMN     "auditNotes" TEXT,
ADD COLUMN     "auditStatus" TEXT NOT NULL DEFAULT 'BELUM_DIAUDIT',
ADD COLUMN     "auditedAt" TIMESTAMP(3),
ADD COLUMN     "auditedById" TEXT;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
