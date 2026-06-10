"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kas_masuk_controller_1 = require("./kas-masuk.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const kas_masuk_schema_1 = require("./kas-masuk.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middleware globally to all Kas Masuk routes
router.use(auth_middleware_1.authenticate);
// Routes with specific RBAC guards
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(kas_masuk_schema_1.getKasMasukQuerySchema), kas_masuk_controller_1.KasMasukController.getKasMasuk);
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(kas_masuk_schema_1.createKasMasukSchema), kas_masuk_controller_1.KasMasukController.createKasMasuk);
router.put('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(kas_masuk_schema_1.updateKasMasukSchema), kas_masuk_controller_1.KasMasukController.updateKasMasuk);
router.delete('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), kas_masuk_controller_1.KasMasukController.deleteKasMasuk);
exports.default = router;
