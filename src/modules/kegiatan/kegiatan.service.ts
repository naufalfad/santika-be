import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';
import { Role, StatusKegiatan, KategoriKegiatan, PrioritasKegiatan } from '@prisma/client';

export class KegiatanService {
  /**
   * Create a new activity proposal
   */
  static async createKegiatan(
    parokiId: string,
    pemohonId: string,
    input: {
      namaKegiatan: string;
      deskripsiKegiatan: string;
      tujuanKegiatan: string;
      kategoriKegiatan: KategoriKegiatan;
      komisiId: string;
      lokasi: string;
      tanggalMulai: Date;
      tanggalSelesai: Date;
      jumlahPeserta: number;
      prioritas: PrioritasKegiatan;
      status?: StatusKegiatan;
      totalAnggaran?: number;
      posDanaId?: string;
    },
    files?: Express.Multer.File[]
  ) {
    // 1. Verify Komisi belongs to Paroki
    const komisi = await prisma.komisi.findUnique({
      where: { id: input.komisiId },
    });
    if (!komisi) {
      throw ApiError.notFound('Komisi tidak ditemukan');
    }
    if (komisi.parokiId !== parokiId) {
      throw ApiError.forbidden('Komisi berada di luar paroki Anda');
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Generate unique nomorKegiatan: KEG-YYYYMMDD-XXXX
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const countToday = await tx.pengajuanKegiatan.count({
        where: {
          komisi: { parokiId },
          createdAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      });

      const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
      const seq = String(countToday + 1).padStart(4, '0');
      const nomorKegiatan = `KEG-${yyyymmdd}-${seq}`;

      const status = input.status || StatusKegiatan.DIAJUKAN;

      // 3. Create activity proposal
      const kegiatan = await tx.pengajuanKegiatan.create({
        data: {
          nomorKegiatan,
          namaKegiatan: input.namaKegiatan,
          deskripsiKegiatan: input.deskripsiKegiatan,
          tujuanKegiatan: input.tujuanKegiatan,
          kategoriKegiatan: input.kategoriKegiatan,
          komisiId: input.komisiId,
          pemohonId,
          lokasi: input.lokasi,
          tanggalMulai: input.tanggalMulai,
          tanggalSelesai: input.tanggalSelesai,
          jumlahPeserta: input.jumlahPeserta,
          prioritas: input.prioritas,
          status,
        },
      });

      // 4. Create document entries if files were uploaded
      if (files && files.length > 0) {
        await Promise.all(
          files.map(async (file) => {
            let docType = 'PROPOSAL';
            const nameLower = file.originalname.toLowerCase();
            if (nameLower.includes('rab') || nameLower.includes('anggaran') || nameLower.includes('budget')) {
              docType = 'RAB';
            } else if (nameLower.includes('surat')) {
              docType = 'SURAT_PERMOHONAN';
            } else if (nameLower.includes('acara') || nameLower.includes('jadwal')) {
              docType = 'JADWAL_ACARA';
            }

            await tx.kegiatanDokumen.create({
              data: {
                kegiatanId: kegiatan.id,
                namaDokumen: file.originalname,
                jenisDokumen: docType as any,
                pathFile: `/uploads/${file.filename}`,
                ukuranFile: file.size,
                uploadedBy: pemohonId,
              },
            });
          })
        );
      }

      // 5. Create initial submission step in history log
      await tx.approvalHistory.create({
        data: {
          step: 'Pengajuan Kegiatan',
          action: 'SUBMIT',
          catatan: status === StatusKegiatan.DRAFT ? 'Kegiatan disimpan sebagai Draft' : 'Kegiatan diajukan oleh Pemohon',
          picId: pemohonId,
          kegiatanId: kegiatan.id,
        },
      });

      // 6. Log to Audit Log
      await tx.auditLog.create({
        data: {
          type: 'APPROVE',
          action: `Pemohon membuat pengajuan kegiatan "${kegiatan.namaKegiatan}" (${nomorKegiatan})`,
          actorId: pemohonId,
          parokiId,
        },
      });

      // 7. If totalAnggaran is provided, auto-create a PermohonanAnggaran
      if (input.totalAnggaran !== undefined && input.totalAnggaran !== null) {
        // Generate proposal number: PA-YYYYMMDD-XXXX
        const countTodayAnggaran = await tx.permohonanAnggaran.count({
          where: {
            kegiatan: { komisi: { parokiId } },
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
        });

        const seqAnggaran = String(countTodayAnggaran + 1).padStart(4, '0');
        const nomorPermohonan = `PA-${yyyymmdd}-${seqAnggaran}`;

        const permohonan = await tx.permohonanAnggaran.create({
          data: {
            nomorPermohonan,
            kegiatanId: kegiatan.id,
            pemohonId,
            tanggalPermohonan: new Date(),
            estimasiBiaya: input.totalAnggaran,
            jumlahDiajukan: input.totalAnggaran,
            jumlahDisetujui: 0,
            posDanaId: input.posDanaId || null,
            status: 'DIAJUKAN',
          },
        });

        // Create default detail item
        await tx.permohonanAnggaranDetail.create({
          data: {
            permohonanId: permohonan.id,
            uraian: `Anggaran Kegiatan: ${kegiatan.namaKegiatan}`,
            qty: 1,
            satuan: 'Kegiatan',
            hargaSatuan: input.totalAnggaran,
            subtotal: input.totalAnggaran,
            keterangan: 'Otomatis dibuat dari pengajuan kegiatan',
          },
        });

        await tx.approvalHistory.create({
          data: {
            step: 'Pengajuan Anggaran',
            action: 'SUBMIT',
            catatan: 'Permohonan anggaran otomatis dibuat bersama pengajuan kegiatan',
            picId: pemohonId,
            permohonanAnggaranId: permohonan.id,
          },
        });
      }

      return kegiatan;
    });
  }

  /**
   * Get list of activities
   */
  static async getKegiatan(
    parokiId: string,
    actorId: string,
    role: Role,
    filters: {
      status?: StatusKegiatan;
      search?: string;
    }
  ) {
    const whereClause: any = {
      komisi: {
        parokiId,
      },
    };

    // RBAC: KETUA_KOMISI can only see their own activities
    if (role === Role.KETUA_KOMISI) {
      whereClause.pemohonId = actorId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.search) {
      whereClause.OR = [
        { namaKegiatan: { contains: filters.search, mode: 'insensitive' } },
        { nomorKegiatan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.pengajuanKegiatan.findMany({
      where: whereClause,
      include: {
        pemohon: {
          select: { id: true, name: true, email: true, role: true },
        },
        komisi: true,
        dokumen: true,
        anggaran: {
          include: {
            details: true,
            posDana: true,
          },
        },
        approvals: {
          include: {
            pic: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single activity detail
   */
  static async getKegiatanById(parokiId: string, id: string) {
    const kegiatan = await prisma.pengajuanKegiatan.findUnique({
      where: { id },
      include: {
        pemohon: {
          select: { id: true, name: true, email: true, role: true },
        },
        komisi: true,
        dokumen: true,
        anggaran: {
          include: {
            details: true,
            posDana: true,
          },
        },
        approvals: {
          include: {
            pic: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { tanggal: 'asc' },
        },
      },
    });

    if (!kegiatan) {
      throw ApiError.notFound('Kegiatan tidak ditemukan');
    }

    if (kegiatan.komisi.parokiId !== parokiId) {
      throw ApiError.forbidden('Kegiatan berada di luar paroki Anda');
    }

    return kegiatan;
  }

  /**
   * Update activity status (approval machine)
   */
  static async updateKegiatanStatus(
    parokiId: string,
    actorId: string,
    role: Role,
    id: string,
    input: {
      action: 'REVIEW' | 'APPROVE' | 'REJECT';
      catatan?: string;
      totalAnggaran?: number;
      posDanaId?: string;
    }
  ) {
    const kegiatan = await prisma.pengajuanKegiatan.findUnique({
      where: { id },
      include: { komisi: true },
    });

    if (!kegiatan) {
      throw ApiError.notFound('Kegiatan tidak ditemukan');
    }

    if (kegiatan.komisi.parokiId !== parokiId) {
      throw ApiError.forbidden('Kegiatan berada di luar paroki Anda');
    }

    let newStatus: StatusKegiatan;
    let stepName: string;

    if (role === Role.BENDAHARA) {
      if (kegiatan.status !== StatusKegiatan.DIAJUKAN) {
        throw ApiError.badRequest(`Kegiatan tidak dapat diproses oleh Bendahara karena berstatus ${kegiatan.status}`);
      }

      if (input.action === 'REVIEW') {
        newStatus = StatusKegiatan.DIREVIEW;
      } else if (input.action === 'REJECT') {
        newStatus = StatusKegiatan.DITOLAK;
      } else {
        throw ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Bendahara`);
      }

      stepName = 'Review Kegiatan Bendahara';
    } else if (role === Role.PASTOR) {
      if (kegiatan.status !== StatusKegiatan.DIREVIEW && kegiatan.status !== StatusKegiatan.DIAJUKAN) {
        throw ApiError.badRequest(`Kegiatan tidak dapat diproses oleh Pastor karena berstatus ${kegiatan.status}`);
      }

      if (input.action === 'APPROVE') {
        newStatus = StatusKegiatan.DISETUJUI;
      } else if (input.action === 'REJECT') {
        newStatus = StatusKegiatan.DITOLAK;
      } else {
        throw ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Pastor`);
      }

      stepName = 'Persetujuan Kegiatan Pastor';
    } else {
      throw ApiError.forbidden('Anda tidak memiliki wewenang untuk meninjau kegiatan ini');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.pengajuanKegiatan.update({
        where: { id },
        data: { status: newStatus, catatanReview: input.catatan || null },
        include: {
          pemohon: { select: { id: true, name: true, email: true, role: true } },
          komisi: true,
          dokumen: true,
          approvals: {
            include: { pic: { select: { id: true, name: true, email: true, role: true } } },
          },
        },
      });

      // Bendahara budget adjustment during review
      if (role === Role.BENDAHARA && input.action === 'REVIEW') {
        const linkedBudget = await tx.permohonanAnggaran.findFirst({
          where: { kegiatanId: id, status: 'DIAJUKAN' },
        });

        if (linkedBudget) {
          const updateData: any = {};
          if (input.totalAnggaran !== undefined && input.totalAnggaran !== null) {
            updateData.estimasiBiaya = input.totalAnggaran;
            updateData.jumlahDiajukan = input.totalAnggaran;
          }
          if (input.posDanaId) {
            updateData.posDanaId = input.posDanaId;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.permohonanAnggaran.update({
              where: { id: linkedBudget.id },
              data: updateData,
            });

            // Also update the subtotal in PermohonanAnggaranDetail
            if (input.totalAnggaran !== undefined && input.totalAnggaran !== null) {
              await tx.permohonanAnggaranDetail.updateMany({
                where: { permohonanId: linkedBudget.id },
                data: {
                  hargaSatuan: input.totalAnggaran,
                  subtotal: input.totalAnggaran,
                },
              });
            }
          }
        }
      }

      await tx.approvalHistory.create({
        data: {
          step: stepName,
          action: input.action,
          catatan: input.catatan || null,
          picId: actorId,
          kegiatanId: id,
        },
      });

      await tx.auditLog.create({
        data: {
          type: 'APPROVE',
          action: `Otoritas memperbarui status kegiatan "${kegiatan.namaKegiatan}" menjadi ${newStatus}`,
          actorId,
          parokiId,
        },
      });

      // Auto-approve or reject linked PermohonanAnggaran records
      if (newStatus === StatusKegiatan.DISETUJUI) {
        const pendingPermohonans = await tx.permohonanAnggaran.findMany({
          where: {
            kegiatanId: id,
            status: 'DIAJUKAN',
          },
        });

        for (const pa of pendingPermohonans) {
          await tx.permohonanAnggaran.update({
            where: { id: pa.id },
            data: {
              status: 'DISETUJUI',
              jumlahDisetujui: pa.jumlahDiajukan,
              approvedById: actorId,
              catatanReview: input.catatan || null,
            },
          });

          await tx.approvalHistory.create({
            data: {
              step: 'Persetujuan Anggaran Pastor',
              action: 'APPROVE',
              catatan: 'Otomatis disetujui bersama persetujuan kegiatan',
              picId: actorId,
              permohonanAnggaranId: pa.id,
            },
          });
        }
      } else if (newStatus === StatusKegiatan.DITOLAK) {
        const pendingPermohonans = await tx.permohonanAnggaran.findMany({
          where: {
            kegiatanId: id,
            status: 'DIAJUKAN',
          },
        });

        for (const pa of pendingPermohonans) {
          await tx.permohonanAnggaran.update({
            where: { id: pa.id },
            data: {
              status: 'DITOLAK',
              reviewedById: actorId,
              catatanReview: input.catatan || null,
            },
          });

          await tx.approvalHistory.create({
            data: {
              step: 'Penolakan Anggaran',
              action: 'REJECT',
              catatan: 'Otomatis ditolak bersama penolakan kegiatan',
              picId: actorId,
              permohonanAnggaranId: pa.id,
            },
          });
        }
      }

      return updated;
    });
  }
}
