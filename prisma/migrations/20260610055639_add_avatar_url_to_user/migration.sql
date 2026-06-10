-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PASTOR', 'BENDAHARA', 'DEWAN_KEUANGAN', 'KETUA_KOMISI', 'TIM_PEMBANGUNAN', 'SEKRETARIAT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'MENUNGGU_VERIFIKASI', 'MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'REVISI');

-- CreateEnum
CREATE TYPE "SpjStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'IMAGE');

-- CreateTable
CREATE TABLE "Paroki" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "keuskupan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paroki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Komisi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Komisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anggaran" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "plafon" DECIMAL(15,2) NOT NULL,
    "terpakai" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sisa" DECIMAL(15,2) NOT NULL,
    "kategori" TEXT NOT NULL,
    "komisiId" TEXT NOT NULL,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanaKhusus" (
    "id" TEXT NOT NULL,
    "namaDana" TEXT NOT NULL,
    "target" DECIMAL(15,2) NOT NULL,
    "terkumpul" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "terpakai" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DanaKhusus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutasiDanaKhusus" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "namaDonatur" TEXT NOT NULL,
    "penerima" TEXT,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "jenis" TEXT NOT NULL,
    "metode" TEXT NOT NULL,
    "danaKhususId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutasiDanaKhusus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KasMasuk" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kategori" TEXT NOT NULL,
    "sumber" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "keterangan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Selesai',
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KasMasuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KasKeluar" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kategori" TEXT NOT NULL,
    "penerima" TEXT NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Selesai',
    "anggaranId" TEXT,
    "attachmentId" TEXT,
    "parokiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KasKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengajuan" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tujuan" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
    "komisiId" TEXT NOT NULL,
    "anggaranId" TEXT NOT NULL,
    "pemohonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengajuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "catatan" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picId" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spj" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "SpjStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedBy" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpjLampiran" (
    "id" TEXT NOT NULL,
    "kategoriFile" TEXT NOT NULL,
    "spjId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,

    CONSTRAINT "SpjLampiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(15,2),
    "actorId" TEXT NOT NULL,
    "parokiId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paroki_nama_key" ON "Paroki"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KasKeluar_attachmentId_key" ON "KasKeluar"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SpjLampiran_attachmentId_key" ON "SpjLampiran"("attachmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Komisi" ADD CONSTRAINT "Komisi_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anggaran" ADD CONSTRAINT "Anggaran_komisiId_fkey" FOREIGN KEY ("komisiId") REFERENCES "Komisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anggaran" ADD CONSTRAINT "Anggaran_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DanaKhusus" ADD CONSTRAINT "DanaKhusus_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiDanaKhusus" ADD CONSTRAINT "MutasiDanaKhusus_danaKhususId_fkey" FOREIGN KEY ("danaKhususId") REFERENCES "DanaKhusus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasMasuk" ADD CONSTRAINT "KasMasuk_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasKeluar" ADD CONSTRAINT "KasKeluar_anggaranId_fkey" FOREIGN KEY ("anggaranId") REFERENCES "Anggaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasKeluar" ADD CONSTRAINT "KasKeluar_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasKeluar" ADD CONSTRAINT "KasKeluar_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengajuan" ADD CONSTRAINT "Pengajuan_komisiId_fkey" FOREIGN KEY ("komisiId") REFERENCES "Komisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengajuan" ADD CONSTRAINT "Pengajuan_anggaranId_fkey" FOREIGN KEY ("anggaranId") REFERENCES "Anggaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengajuan" ADD CONSTRAINT "Pengajuan_pemohonId_fkey" FOREIGN KEY ("pemohonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spj" ADD CONSTRAINT "Spj_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpjLampiran" ADD CONSTRAINT "SpjLampiran_spjId_fkey" FOREIGN KEY ("spjId") REFERENCES "Spj"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpjLampiran" ADD CONSTRAINT "SpjLampiran_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_parokiId_fkey" FOREIGN KEY ("parokiId") REFERENCES "Paroki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
