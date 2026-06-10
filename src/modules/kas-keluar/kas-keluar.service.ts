import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';
import fs from 'fs';
import path from 'path';

export class KasKeluarService {
  /**
   * Get list of Kas Keluar records scoped to Paroki with filters
   */
  static async getKasKeluar(
    parokiId: string,
    filters: {
      search?: string;
      kategori?: string;
      anggaranId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const whereClause: any = {
      parokiId,
    };

    if (filters.kategori) {
      whereClause.kategori = filters.kategori;
    }

    if (filters.anggaranId) {
      whereClause.anggaranId = filters.anggaranId;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.tanggal = {};
      if (filters.startDate) {
        whereClause.tanggal.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.tanggal.lte = filters.endDate;
      }
    }

    if (filters.search) {
      whereClause.penerima = { contains: filters.search, mode: 'insensitive' };
    }

    return await prisma.kasKeluar.findMany({
      where: whereClause,
      include: {
        attachment: true,
        anggaran: {
          include: {
            komisi: true,
          },
        },
      },
      orderBy: [
        { tanggal: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Create a new Kas Keluar record
   */
  static async createKasKeluar(
    parokiId: string,
    actorId: string,
    input: {
      tanggal: Date;
      kategori: string;
      penerima: string;
      jumlah: number;
      anggaranId?: string;
    },
    file?: Express.Multer.File
  ) {
    return await prisma.$transaction(async (tx) => {
      let attachmentId: string | undefined = undefined;

      // 1. Process budget check and deduction if anggaranId is supplied
      if (input.anggaranId) {
        const anggaran = await tx.anggaran.findUnique({
          where: { id: input.anggaranId },
        });

        if (!anggaran) {
          throw ApiError.notFound('Pos Anggaran tidak ditemukan');
        }

        if (anggaran.parokiId !== parokiId) {
          throw ApiError.forbidden('Pos Anggaran berada di luar paroki Anda');
        }

        const remaining = Number(anggaran.plafon) - Number(anggaran.terpakai);
        if (input.jumlah > remaining) {
          throw ApiError.badRequest(
            `Plafon anggaran tidak mencukupi. Sisa: Rp ${remaining.toLocaleString('id-ID')}, Dibutuhkan: Rp ${input.jumlah.toLocaleString('id-ID')}`
          );
        }

        // Deduct from budget
        const newTerpakai = Number(anggaran.terpakai) + input.jumlah;
        const newSisa = Number(anggaran.plafon) - newTerpakai;

        await tx.anggaran.update({
          where: { id: input.anggaranId },
          data: {
            terpakai: newTerpakai,
            sisa: newSisa,
          },
        });
      }

      // 2. Handle File Attachment
      if (file) {
        const isPdf = file.mimetype === 'application/pdf';
        const newAttachment = await tx.attachment.create({
          data: {
            fileName: file.originalname,
            fileType: isPdf ? 'PDF' : 'IMAGE',
            fileUrl: `/uploads/${file.filename}`,
            fileSize: file.size,
          },
        });
        attachmentId = newAttachment.id;
      }

      // 3. Create Kas Keluar record
      const newTransaction = await tx.kasKeluar.create({
        data: {
          tanggal: input.tanggal,
          kategori: input.kategori,
          penerima: input.penerima,
          jumlah: input.jumlah,
          status: 'Selesai',
          anggaranId: input.anggaranId || null,
          attachmentId: attachmentId || null,
          parokiId,
        },
        include: {
          attachment: true,
          anggaran: true,
        },
      });

      // 4. Create Audit Log
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(input.jumlah);

      await tx.auditLog.create({
        data: {
          type: 'OUT',
          action: `Mencatat Kas Keluar untuk ${input.penerima} kategori ${input.kategori} senilai ${formattedAmount}`,
          amount: input.jumlah,
          actorId,
          parokiId,
        },
      });

      return newTransaction;
    });
  }

  /**
   * Update an existing Kas Keluar record
   */
  static async updateKasKeluar(
    parokiId: string,
    actorId: string,
    id: string,
    input: {
      tanggal?: Date;
      kategori?: string;
      penerima?: string;
      jumlah?: number;
      anggaranId?: string | null;
    },
    file?: Express.Multer.File
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch existing record and boundaries
      const existing = await tx.kasKeluar.findUnique({
        where: { id },
        include: { attachment: true, anggaran: true },
      });

      if (!existing) {
        throw ApiError.notFound('Transaksi Kas Keluar tidak ditemukan');
      }

      if (existing.parokiId !== parokiId) {
        throw ApiError.forbidden('Anda tidak memiliki akses untuk mengubah transaksi ini');
      }

      const updatedJumlah = input.jumlah !== undefined ? input.jumlah : Number(existing.jumlah);
      // Wait, Zod transform of null for anggaranId could be passed as input.anggaranId: null
      const updatedAnggaranId = input.anggaranId !== undefined ? input.anggaranId : existing.anggaranId;

      // 2. Budget adjustment logic if budget OR amount changed
      const budgetOrAmountChanged =
        updatedJumlah !== Number(existing.jumlah) || updatedAnggaranId !== existing.anggaranId;

      if (budgetOrAmountChanged) {
        // Step 2a: Revert old budget deduction if previously linked
        if (existing.anggaranId) {
          const oldAnggaran = await tx.anggaran.findUnique({
            where: { id: existing.anggaranId },
          });
          if (oldAnggaran) {
            const revertedTerpakai = Number(oldAnggaran.terpakai) - Number(existing.jumlah);
            const revertedSisa = Number(oldAnggaran.plafon) - revertedTerpakai;

            await tx.anggaran.update({
              where: { id: oldAnggaran.id },
              data: {
                terpakai: revertedTerpakai,
                sisa: revertedSisa,
              },
            });
          }
        }

        // Step 2b: Apply new budget deduction if currently linked
        if (updatedAnggaranId) {
          const newAnggaran = await tx.anggaran.findUnique({
            where: { id: updatedAnggaranId },
          });

          if (!newAnggaran) {
            throw ApiError.notFound('Pos Anggaran baru tidak ditemukan');
          }
          if (newAnggaran.parokiId !== parokiId) {
            throw ApiError.forbidden('Pos Anggaran baru berada di luar paroki Anda');
          }

          const remaining = Number(newAnggaran.plafon) - Number(newAnggaran.terpakai);
          if (updatedJumlah > remaining) {
            throw ApiError.badRequest(
              `Plafon anggaran baru tidak mencukupi. Sisa: Rp ${remaining.toLocaleString('id-ID')}, Dibutuhkan: Rp ${updatedJumlah.toLocaleString('id-ID')}`
            );
          }

          // Deduct budget
          const newTerpakai = Number(newAnggaran.terpakai) + updatedJumlah;
          const newSisa = Number(newAnggaran.plafon) - newTerpakai;

          await tx.anggaran.update({
            where: { id: updatedAnggaranId },
            data: {
              terpakai: newTerpakai,
              sisa: newSisa,
            },
          });
        }
      }

      // 3. Handle File Attachment updates
      let attachmentId = existing.attachmentId;
      let fileToDelete: string | null = null;

      if (file) {
        // Schedule old file for physical deletion
        if (existing.attachment) {
          fileToDelete = existing.attachment.fileUrl;
        }

        // Save new attachment
        const isPdf = file.mimetype === 'application/pdf';
        const newAttachment = await tx.attachment.create({
          data: {
            fileName: file.originalname,
            fileType: isPdf ? 'PDF' : 'IMAGE',
            fileUrl: `/uploads/${file.filename}`,
            fileSize: file.size,
          },
        });
        attachmentId = newAttachment.id;
      }

      // 4. Update transaction
      const updated = await tx.kasKeluar.update({
        where: { id },
        data: {
          tanggal: input.tanggal,
          kategori: input.kategori,
          penerima: input.penerima,
          jumlah: input.jumlah,
          anggaranId: updatedAnggaranId,
          attachmentId,
        },
        include: { attachment: true, anggaran: true },
      });

      // 5. Clean up old attachment file and DB record if overridden
      if (file && existing.attachment) {
        await tx.attachment.delete({
          where: { id: existing.attachment.id },
        });

        if (fileToDelete) {
          const relativePath = fileToDelete.startsWith('/') ? fileToDelete.substring(1) : fileToDelete;
          const fullPath = path.join(process.cwd(), relativePath);
          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          } catch (err) {
            console.error('Failed to delete physical file during update:', err);
          }
        }
      }

      // 6. Write Audit Log
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(updatedJumlah);

      const targetPenerima = input.penerima || existing.penerima;
      await tx.auditLog.create({
        data: {
          type: 'OUT',
          action: `Memperbarui transaksi Kas Keluar: ${targetPenerima} senilai ${formattedAmount}`,
          amount: updatedJumlah,
          actorId,
          parokiId,
        },
      });

      return updated;
    });
  }

  /**
   * Delete a Kas Keluar record
   */
  static async deleteKasKeluar(parokiId: string, actorId: string, id: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch transaction and boundaries
      const existing = await tx.kasKeluar.findUnique({
        where: { id },
        include: { attachment: true, anggaran: true },
      });

      if (!existing) {
        throw ApiError.notFound('Transaksi Kas Keluar tidak ditemukan');
      }

      if (existing.parokiId !== parokiId) {
        throw ApiError.forbidden('Anda tidak memiliki akses untuk menghapus transaksi ini');
      }

      // 2. Revert budget deduction if linked
      if (existing.anggaranId) {
        const oldAnggaran = await tx.anggaran.findUnique({
          where: { id: existing.anggaranId },
        });
        if (oldAnggaran) {
          const revertedTerpakai = Number(oldAnggaran.terpakai) - Number(existing.jumlah);
          const revertedSisa = Number(oldAnggaran.plafon) - revertedTerpakai;

          await tx.anggaran.update({
            where: { id: oldAnggaran.id },
            data: {
              terpakai: revertedTerpakai,
              sisa: revertedSisa,
            },
          });
        }
      }

      // 3. Delete Kas Keluar record
      await tx.kasKeluar.delete({
        where: { id },
      });

      // 4. Delete attachment file and record if any
      if (existing.attachment) {
        await tx.attachment.delete({
          where: { id: existing.attachment.id },
        });

        const fileToDelete = existing.attachment.fileUrl;
        const relativePath = fileToDelete.startsWith('/') ? fileToDelete.substring(1) : fileToDelete;
        const fullPath = path.join(process.cwd(), relativePath);
        try {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Failed to delete physical file during deletion:', err);
        }
      }

      // 5. Write Audit Log
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(Number(existing.jumlah));

      await tx.auditLog.create({
        data: {
          type: 'OUT',
          action: `Menghapus transaksi Kas Keluar: ${existing.penerima} yang bernilai ${formattedAmount}`,
          amount: existing.jumlah,
          actorId,
          parokiId,
        },
      });

      return existing;
    });
  }
}
