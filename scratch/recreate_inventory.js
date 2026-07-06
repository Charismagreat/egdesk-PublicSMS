"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var egdesk_helpers_1 = require("../egdesk-helpers");
function setupInventory() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    console.log('🔄 Cleaning up old metadata...');
                    return [4 /*yield*/, (0, egdesk_helpers_1.deleteTable)('inventory_items').catch(function () { })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, egdesk_helpers_1.deleteTable)('inventory_logs').catch(function () { })];
                case 2:
                    _a.sent();
                    console.log('🔄 Creating inventory_items table...');
                    return [4 /*yield*/, (0, egdesk_helpers_1.createTable)('재고 품목', [
                            { name: 'type', type: 'TEXT', notNull: true }, // 'material' (자재) 또는 'product' (제품)
                            { name: 'name', type: 'TEXT', notNull: true }, // 품목명
                            { name: 'category', type: 'TEXT', notNull: true }, // 카테고리
                            { name: 'price', type: 'REAL', notNull: true }, // 자재는 매입가, 제품은 판매가
                            { name: 'partner', type: 'TEXT' }, // 매입 거래처 (자재 전용)
                            { name: 'stock', type: 'INTEGER', notNull: true }, // 현재 재고량
                            { name: 'safeStock', type: 'INTEGER', notNull: true }, // 안전 재고량
                            { name: 'location', type: 'TEXT' }, // 창고 보관 위치
                            { name: 'spec', type: 'TEXT' }, // 규격
                            { name: 'unitType', type: 'TEXT' }, // 단위 구분 (count, weight, box)
                            { name: 'unitValue', type: 'TEXT' }, // 단위 세부 단위명 (g, kg, 등)
                            { name: 'boxContains', type: 'INTEGER' }, // 박스당 입수량
                            { name: 'description', type: 'TEXT' }, // 품목 설명
                            { name: 'tags', type: 'TEXT' }, // 커스텀 멀티 태그 콤마 구분값
                            { name: 'barcode', type: 'TEXT' }, // 바코드 번호 (리더기용)
                            { name: 'createdAt', type: 'TEXT', notNull: true } // 등록 일자
                        ], { tableName: 'inventory_items' })];
                case 3:
                    _a.sent();
                    console.log('✅ inventory_items table created.');
                    console.log('🔄 Creating inventory_logs table...');
                    return [4 /*yield*/, (0, egdesk_helpers_1.createTable)('재고 변동 이력', [
                            { name: 'itemId', type: 'INTEGER', notNull: true }, // 품목 ID
                            { name: 'itemName', type: 'TEXT', notNull: true }, // 품목명
                            { name: 'itemType', type: 'TEXT', notNull: true }, // 품목 구분 ('material' / 'product')
                            { name: 'changeType', type: 'TEXT', notNull: true }, // 변동 유형 ('in' 입고, 'out' 출고, 'adjust' 실사조정)
                            { name: 'quantity', type: 'INTEGER', notNull: true }, // 변동 수량 (실사조정의 경우 조정 후의 최종 수량)
                            { name: 'price', type: 'REAL', notNull: true }, // 당시 단가
                            { name: 'operator', type: 'TEXT', notNull: true }, // 담당자
                            { name: 'note', type: 'TEXT' }, // 변동 사유 / 메모
                            { name: 'createdAt', type: 'TEXT', notNull: true } // 발생 시간
                        ], { tableName: 'inventory_logs' })];
                case 4:
                    _a.sent();
                    console.log('✅ inventory_logs table created.');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('❌ Error creating tables:', error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
setupInventory();
