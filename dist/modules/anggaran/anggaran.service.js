"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnggaranService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class AnggaranService {
    /**
     * Get list of Anggaran records scoped to Paroki with filters
     */
    static async getAnggaran(parokiId, filters) {
        const whereClause = {
            parokiId,
        };
        if (filters.tahun !== undefined) {
            whereClause.tahun = filters.tahun;
        }
        if (filters.komisiId !== undefined) {
            whereClause.komisiId = filters.komisiId;
        }
        return await database_1.prisma.anggaran.findMany({
            where: whereClause,
            include: {
                komisi: true,
            },
            orderBy: {
                tahun: 'desc',
            },
        });
    }
    /**
     * Create a new Anggaran allocation
     */
    static async createAnggaran(parokiId, actorId, input) {
        // 1. Validate Komisi ownership and boundary
        const komisi = await database_1.prisma.komisi.findUnique({
            where: { id: input.komisiId },
        });
        if (!komisi) {
            throw api_error_1.ApiError.notFound('Komisi tidak ditemukan');
        }
        if (komisi.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Komisi berada di luar paroki Anda');
        }
        // 2. Prevent duplicate allocation for the same commission and year in this Paroki
        const existing = await database_1.prisma.anggaran.findFirst({
            where: {
                parokiId,
                komisiId: input.komisiId,
                tahun: input.tahun,
            },
        });
        if (existing) {
            throw api_error_1.ApiError.badRequest(`Anggaran untuk Komisi ${komisi.nama} pada tahun ${input.tahun} sudah dialokasikan`);
        }
        // 3. Save to database
        const newAnggaran = await database_1.prisma.anggaran.create({
            data: {
                tahun: input.tahun,
                plafon: input.plafon,
                terpakai: 0,
                sisa: input.plafon,
                kategori: input.kategori,
                komisiId: input.komisiId,
                parokiId,
            },
            include: {
                komisi: true,
            },
        });
        // 4. Record Audit Log
        const formattedPlafon = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(input.plafon);
        await database_1.prisma.auditLog.create({
            data: {
                type: 'IN',
                action: `Mengalokasikan anggaran Komisi ${komisi.nama} tahun ${input.tahun} senilai ${formattedPlafon}`,
                amount: input.plafon,
                actorId,
                parokiId,
            },
        });
        return newAnggaran;
    }
    /**
     * Update an existing Anggaran allocation
     */
    static async updateAnggaran(parokiId, actorId, id, input) {
        // 1. Fetch existing record and verify boundaries
        const existing = await database_1.prisma.anggaran.findUnique({
            where: { id },
            include: { komisi: true },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Data Anggaran tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Anda tidak memiliki akses untuk mengubah anggaran ini');
        }
        const updatedPlafon = input.plafon !== undefined ? input.plafon : Number(existing.plafon);
        const updatedTahun = input.tahun !== undefined ? input.tahun : existing.tahun;
        const updatedKomisiId = input.komisiId !== undefined ? input.komisiId : existing.komisiId;
        // 2. Validate plafon limit bounds
        const terpakai = Number(existing.terpakai);
        if (updatedPlafon < terpakai) {
            throw api_error_1.ApiError.badRequest(`Plafon baru tidak boleh lebih kecil dari nominal anggaran terpakai (Rp ${terpakai.toLocaleString('id-ID')})`);
        }
        // 3. If komisiId or tahun changes, check duplicate constraints
        if (updatedTahun !== existing.tahun || updatedKomisiId !== existing.komisiId) {
            // Validate new Komisi if changed
            if (input.komisiId && input.komisiId !== existing.komisiId) {
                const newKomisi = await database_1.prisma.komisi.findUnique({
                    where: { id: input.komisiId },
                });
                if (!newKomisi) {
                    throw api_error_1.ApiError.notFound('Komisi baru tidak ditemukan');
                }
                if (newKomisi.parokiId !== parokiId) {
                    throw api_error_1.ApiError.forbidden('Komisi baru berada di luar paroki Anda');
                }
            }
            // Check unique constraint duplicate
            const duplicate = await database_1.prisma.anggaran.findFirst({
                where: {
                    parokiId,
                    komisiId: updatedKomisiId,
                    tahun: updatedTahun,
                    id: { not: id },
                },
            });
            if (duplicate) {
                throw api_error_1.ApiError.badRequest(`Anggaran untuk Komisi tersebut pada tahun ${updatedTahun} sudah dialokasikan`);
            }
        }
        // 4. Update in database
        const newSisa = updatedPlafon - terpakai;
        const updatedAnggaran = await database_1.prisma.anggaran.update({
            where: { id },
            data: {
                tahun: input.tahun,
                plafon: input.plafon,
                sisa: newSisa,
                kategori: input.kategori,
                komisiId: input.komisiId,
            },
            include: {
                komisi: true,
            },
        });
        // 5. Record Audit Log
        const formattedPlafon = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(updatedPlafon);
        await database_1.prisma.auditLog.create({
            data: {
                type: 'IN',
                action: `Memperbarui alokasi anggaran Komisi ${updatedAnggaran.komisi.nama} tahun ${updatedAnggaran.tahun} senilai ${formattedPlafon}`,
                amount: updatedPlafon,
                actorId,
                parokiId,
            },
        });
        return updatedAnggaran;
    }
}
exports.AnggaranService = AnggaranService;
