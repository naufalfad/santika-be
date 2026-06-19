/*
  Warnings:

  - You are about to drop the column `pengajuanId` on the `ApprovalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `pengajuanId` on the `Spj` table. All the data in the column will be lost.
  - You are about to drop the `DanaKhusus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KasKeluar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KasMasuk` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MutasiDanaKhusus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pengajuan` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cashTransactionId]` on the table `Spj` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "KategoriKegiatan" AS ENUM ('OMK', 'LITURGI', 'SOSIAL', 'PENDIDIKAN', 'PASTORAL', 'LINGKUNGAN', 'PEMELIHARAAN', 'OPERASIONAL', 'LAINNYA');

-- CreateEnum
CREATE TYPE "PrioritasKegiatan" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI', 'DARURAT');

-- CreateEnum
CREATE TYPE "StatusKegiatan" AS ENUM ('DRAFT', 'DIAJUKAN', 'DIREVIEW', 'DISETUJUI', 'DITOLAK', 'SELESAI');

-- CreateEnum
CREATE TYPE "JenisDokumenKegiatan" AS ENUM ('PROPOSAL', 'SURAT_PERMOHONAN', 'RAB', 'JADWAL_ACARA', 'SURAT_TUGAS', 'NOTULENSI', 'FOTO_PENDUKUNG', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusPermohonanAnggaran" AS ENUM ('DRAFT', 'DIAJUKAN', 'DIREVIEW_BENDAHARA', 'MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'DICAIRKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "SpecialFundStatus" AS ENUM ('DRAFT', 'AKTIF', 'DITUTUP');

-- DropForeignKey
ALTER TABLE "ApprovalHistory" DROP CONSTRAINT "ApprovalHistory_pengajuanId_fkey";

-- DropForeignKey
ALTER TABLE "DanaKhusus" DROP CONSTRAINT "DanaKhusus_parokiId_fkey";

-- DropForeignKey
ALTER TABLE "KasKeluar" DROP CONSTRAINT "KasKeluar_attachmentId_fkey";

-- DropForeignKey
ALTER TABLE "KasKeluar" DROP CONSTRAINT "KasKeluar_budgetItemId_fkey";

-- DropForeignKey
ALTER TABLE "KasKeluar" DROP CONSTRAINT "KasKeluar_parokiId_fkey";

-- DropForeignKey
ALTER TABLE "KasMasuk" DROP CONSTRAINT "KasMasuk_parokiId_fkey";

-- DropForeignKey
ALTER TABLE "MutasiDanaKhusus" DROP CONSTRAINT "MutasiDanaKhusus_danaKhususId_fkey";

-- DropForeignKey
ALTER TABLE "Pengajuan" DROP CONSTRAINT "Pengajuan_budgetItemId_fkey";

-- DropForeignKey
ALTER TABLE "Pengajuan" DROP CONSTRAINT "Pengajuan_komisiId_fkey";

-- DropForeignKey
ALTER TABLE "Pengajuan" DROP CONSTRAINT "Pengajuan_pemohonId_fkey";

-- DropForeignKey
ALTER TABLE "Spj" DROP CONSTRAINT "Spj_pengajuanId_fkey";

-- AlterTable
ALTER TABLE "ApprovalHistory" DROP COLUMN "pengajuanId",
ADD COLUMN     "kegiatanId" TEXT,
ADD COLUMN     "permohonanAnggaranId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "newData" JSONB,
ADD COLUMN     "oldData" JSONB;

-- AlterTable
ALTER TABLE "CashTransaction" ADD COLUMN     "isUangMuka" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentTransactionId" TEXT,
ADD COLUMN     "permohonanAnggaranId" TEXT,
ADD COLUMN     "specialFundId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SELESAI';

-- AlterTable
ALTER TABLE "Spj" DROP COLUMN "pengajuanId",
ADD COLUMN     "cashTransactionId" TEXT,
ADD COLUMN     "kegiatanId" TEXT,
ADD COLUMN     "permohonanAnggaranId" TEXT,
ADD COLUMN     "posDanaId" TEXT;

-- DropTable
DROP TABLE "DanaKhusus";

-- DropTable
DROP TABLE "KasKeluar";

-- DropTable
DROP TABLE "KasMasuk";

-- DropTable
DROP TABLE "MutasiDanaKhusus";

-- DropTable
DROP TABLE "Pengajuan";

-- DropEnum
DROP TYPE "ApprovalStatus";

-- CreateTable
CREATE TABLE "SpecialFund" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tujuanPenggalangan" TEXT,
    "targetNominal" DECIMAL(15,2),
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "status" "SpecialFundStatus" NOT NULL DEFAULT 'DRAFT',
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fundCategoryId" TEXT,

    CONSTRAINT "SpecialFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialFundAllocation" (
    "id" TEXT NOT NULL,
    "specialFundId" TEXT NOT NULL,
    "targetPosDanaId" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialFundAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanKegiatan" (
    "id" TEXT NOT NULL,
    "nomorKegiatan" TEXT NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "deskripsiKegiatan" TEXT NOT NULL,
    "tujuanKegiatan" TEXT NOT NULL,
    "kategoriKegiatan" "KategoriKegiatan" NOT NULL,
    "komisiId" TEXT NOT NULL,
    "pemohonId" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "jumlahPeserta" INTEGER NOT NULL,
    "prioritas" "PrioritasKegiatan" NOT NULL,
    "status" "StatusKegiatan" NOT NULL DEFAULT 'DRAFT',
    "catatanReview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengajuanKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KegiatanDokumen" (
    "id" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "namaDokumen" TEXT NOT NULL,
    "jenisDokumen" "JenisDokumenKegiatan" NOT NULL,
    "pathFile" TEXT NOT NULL,
    "ukuranFile" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KegiatanDokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermohonanAnggaran" (
    "id" TEXT NOT NULL,
    "nomorPermohonan" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "pemohonId" TEXT NOT NULL,
    "tanggalPermohonan" TIMESTAMP(3) NOT NULL,
    "estimasiBiaya" DECIMAL(15,2) NOT NULL,
    "jumlahDiajukan" DECIMAL(15,2) NOT NULL,
    "jumlahDisetujui" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "posDanaId" TEXT,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "catatanReview" TEXT,
    "status" "StatusPermohonanAnggaran" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermohonanAnggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermohonanAnggaranDetail" (
    "id" TEXT NOT NULL,
    "permohonanId" TEXT NOT NULL,
    "uraian" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "satuan" TEXT NOT NULL,
    "hargaSatuan" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "PermohonanAnggaranDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialFund_fundCategoryId_key" ON "SpecialFund"("fundCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialFund_parokiId_code_key" ON "SpecialFund"("parokiId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PengajuanKegiatan_nomorKegiatan_key" ON "PengajuanKegiatan"("nomorKegiatan");

-- CreateIndex
CREATE UNIQUE INDEX "PermohonanAnggaran_nomorPermohonan_key" ON "PermohonanAnggaran"("nomorPermohonan");

-- CreateIndex
CREATE UNIQUE INDEX "Spj_cashTransactionId_key" ON "Spj"("cashTransactionId");

-- AddForeignKey
ALTER TABLE "SpecialFund" ADD CONSTRAINT "SpecialFund_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialFund" ADD CONSTRAINT "SpecialFund_fundCategoryId_fkey" FOREIGN KEY ("fundCategoryId") REFERENCES "FundCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialFundAllocation" ADD CONSTRAINT "SpecialFundAllocation_specialFundId_fkey" FOREIGN KEY ("specialFundId") REFERENCES "SpecialFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialFundAllocation" ADD CONSTRAINT "SpecialFundAllocation_targetPosDanaId_fkey" FOREIGN KEY ("targetPosDanaId") REFERENCES "FundCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialFundAllocation" ADD CONSTRAINT "SpecialFundAllocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanKegiatan" ADD CONSTRAINT "PengajuanKegiatan_komisiId_fkey" FOREIGN KEY ("komisiId") REFERENCES "Komisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanKegiatan" ADD CONSTRAINT "PengajuanKegiatan_pemohonId_fkey" FOREIGN KEY ("pemohonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KegiatanDokumen" ADD CONSTRAINT "KegiatanDokumen_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "PengajuanKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaran" ADD CONSTRAINT "PermohonanAnggaran_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "PengajuanKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaran" ADD CONSTRAINT "PermohonanAnggaran_pemohonId_fkey" FOREIGN KEY ("pemohonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaran" ADD CONSTRAINT "PermohonanAnggaran_posDanaId_fkey" FOREIGN KEY ("posDanaId") REFERENCES "FundCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaran" ADD CONSTRAINT "PermohonanAnggaran_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaran" ADD CONSTRAINT "PermohonanAnggaran_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermohonanAnggaranDetail" ADD CONSTRAINT "PermohonanAnggaranDetail_permohonanId_fkey" FOREIGN KEY ("permohonanId") REFERENCES "PermohonanAnggaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "PengajuanKegiatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_permohonanAnggaranId_fkey" FOREIGN KEY ("permohonanAnggaranId") REFERENCES "PermohonanAnggaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spj" ADD CONSTRAINT "Spj_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "PengajuanKegiatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spj" ADD CONSTRAINT "Spj_permohonanAnggaranId_fkey" FOREIGN KEY ("permohonanAnggaranId") REFERENCES "PermohonanAnggaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spj" ADD CONSTRAINT "Spj_posDanaId_fkey" FOREIGN KEY ("posDanaId") REFERENCES "FundCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spj" ADD CONSTRAINT "Spj_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_permohonanAnggaranId_fkey" FOREIGN KEY ("permohonanAnggaranId") REFERENCES "PermohonanAnggaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_specialFundId_fkey" FOREIGN KEY ("specialFundId") REFERENCES "SpecialFund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
