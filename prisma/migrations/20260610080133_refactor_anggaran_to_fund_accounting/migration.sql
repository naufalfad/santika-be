/*
  Warnings:

  - You are about to drop the column `anggaranId` on the `KasKeluar` table. All the data in the column will be lost.
  - You are about to drop the column `anggaranId` on the `Pengajuan` table. All the data in the column will be lost.
  - You are about to drop the `Anggaran` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `budgetItemId` to the `Pengajuan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Anggaran" DROP CONSTRAINT "Anggaran_komisiId_fkey";

-- DropForeignKey
ALTER TABLE "Anggaran" DROP CONSTRAINT "Anggaran_parokiId_fkey";

-- DropForeignKey
ALTER TABLE "KasKeluar" DROP CONSTRAINT "KasKeluar_anggaranId_fkey";

-- DropForeignKey
ALTER TABLE "Pengajuan" DROP CONSTRAINT "Pengajuan_anggaranId_fkey";

-- AlterTable
ALTER TABLE "KasKeluar" DROP COLUMN "anggaranId",
ADD COLUMN     "budgetItemId" TEXT;

-- AlterTable
ALTER TABLE "Pengajuan" DROP COLUMN "anggaranId",
ADD COLUMN     "budgetItemId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Anggaran";

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "fundCategoryId" TEXT NOT NULL,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plafon" DECIMAL(15,2) NOT NULL,
    "komisiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "transactionNo" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionType" TEXT NOT NULL,
    "fundCategoryId" TEXT NOT NULL,
    "incomeTypeId" TEXT,
    "expenseTypeId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "attachmentId" TEXT,
    "budgetItemId" TEXT,
    "createdById" TEXT NOT NULL,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_parokiId_fundCategoryId_tahun_key" ON "Budget"("parokiId", "fundCategoryId", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "FundCategory_parokiId_code_key" ON "FundCategory"("parokiId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FundCategory_parokiId_name_key" ON "FundCategory"("parokiId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeType_parokiId_code_key" ON "IncomeType"("parokiId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeType_parokiId_name_key" ON "IncomeType"("parokiId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseType_parokiId_code_key" ON "ExpenseType"("parokiId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseType_parokiId_name_key" ON "ExpenseType"("parokiId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_attachmentId_key" ON "CashTransaction"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_parokiId_transactionNo_key" ON "CashTransaction"("parokiId", "transactionNo");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_fundCategoryId_fkey" FOREIGN KEY ("fundCategoryId") REFERENCES "FundCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_komisiId_fkey" FOREIGN KEY ("komisiId") REFERENCES "Komisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasKeluar" ADD CONSTRAINT "KasKeluar_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengajuan" ADD CONSTRAINT "Pengajuan_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundCategory" ADD CONSTRAINT "FundCategory_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeType" ADD CONSTRAINT "IncomeType_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseType" ADD CONSTRAINT "ExpenseType_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_fundCategoryId_fkey" FOREIGN KEY ("fundCategoryId") REFERENCES "FundCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_incomeTypeId_fkey" FOREIGN KEY ("incomeTypeId") REFERENCES "IncomeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "ExpenseType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
