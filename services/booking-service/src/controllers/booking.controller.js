"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
var internal_auth_guard_1 = require("@cab-booking/shared/dist/guards/internal-auth.guard");
var BookingController = function () {
    var _classDecorators = [(0, common_1.Controller)('bookings'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createBooking_decorators;
    var _getMyBookings_decorators;
    var _getBooking_decorators;
    var _acceptBooking_decorators;
    var _updateStatus_decorators;
    var _updateLocation_decorators;
    var _assignDriver_decorators;
    var _noDriverFound_decorators;
    var BookingController = _classThis = /** @class */ (function () {
        function BookingController_1(bookingService) {
            this.bookingService = (__runInitializers(this, _instanceExtraInitializers), bookingService);
        }
        BookingController_1.prototype.createBooking = function (req, createDto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // req.user.sub là customerId từ JWT
                    return [2 /*return*/, this.bookingService.createBooking(req.user.sub, createDto)];
                });
            });
        };
        BookingController_1.prototype.getMyBookings = function (req, page, limit, role) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (req.user.role === 'driver') {
                        return [2 /*return*/, this.bookingService.getDriverBookings(req.user.sub, page, limit)];
                    }
                    return [2 /*return*/, this.bookingService.getCustomerBookings(req.user.sub, page, limit)];
                });
            });
        };
        BookingController_1.prototype.getBooking = function (req, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.bookingService.getBooking(id, req.user.sub, req.user.role)];
                });
            });
        };
        BookingController_1.prototype.acceptBooking = function (id, acceptDto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.bookingService.acceptBooking(id, acceptDto)];
                });
            });
        };
        BookingController_1.prototype.updateStatus = function (id, updateDto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.bookingService.updateStatus(id, updateDto)];
                });
            });
        };
        BookingController_1.prototype.updateLocation = function (req, id, locationDto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Driver cập nhật vị trí
                        return [4 /*yield*/, this.bookingService.updateLocation(id, req.user.sub, locationDto.location)];
                        case 1:
                            // Driver cập nhật vị trí
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        BookingController_1.prototype.assignDriver = function (id, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.bookingService.assignDriver(id, body.driverId)];
                });
            });
        };
        BookingController_1.prototype.noDriverFound = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.bookingService.updateStatus(id, { status: 'no_driver' })];
                });
            });
        };
        return BookingController_1;
    }());
    __setFunctionName(_classThis, "BookingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createBooking_decorators = [(0, common_1.Post)()];
        _getMyBookings_decorators = [(0, common_1.Get)()];
        _getBooking_decorators = [(0, common_1.Get)(':id')];
        _acceptBooking_decorators = [(0, common_1.Patch)(':id/accept')];
        _updateStatus_decorators = [(0, common_1.Patch)(':id/status')];
        _updateLocation_decorators = [(0, common_1.Patch)(':id/location'), (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT)];
        _assignDriver_decorators = [(0, common_1.Patch)(':id/assign-driver'), (0, common_1.UseGuards)(internal_auth_guard_1.InternalAuthGuard)];
        _noDriverFound_decorators = [(0, common_1.Patch)(':id/no-driver'), (0, common_1.UseGuards)(internal_auth_guard_1.InternalAuthGuard)];
        __esDecorate(_classThis, null, _createBooking_decorators, { kind: "method", name: "createBooking", static: false, private: false, access: { has: function (obj) { return "createBooking" in obj; }, get: function (obj) { return obj.createBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyBookings_decorators, { kind: "method", name: "getMyBookings", static: false, private: false, access: { has: function (obj) { return "getMyBookings" in obj; }, get: function (obj) { return obj.getMyBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBooking_decorators, { kind: "method", name: "getBooking", static: false, private: false, access: { has: function (obj) { return "getBooking" in obj; }, get: function (obj) { return obj.getBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _acceptBooking_decorators, { kind: "method", name: "acceptBooking", static: false, private: false, access: { has: function (obj) { return "acceptBooking" in obj; }, get: function (obj) { return obj.acceptBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: function (obj) { return "updateStatus" in obj; }, get: function (obj) { return obj.updateStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateLocation_decorators, { kind: "method", name: "updateLocation", static: false, private: false, access: { has: function (obj) { return "updateLocation" in obj; }, get: function (obj) { return obj.updateLocation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _assignDriver_decorators, { kind: "method", name: "assignDriver", static: false, private: false, access: { has: function (obj) { return "assignDriver" in obj; }, get: function (obj) { return obj.assignDriver; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _noDriverFound_decorators, { kind: "method", name: "noDriverFound", static: false, private: false, access: { has: function (obj) { return "noDriverFound" in obj; }, get: function (obj) { return obj.noDriverFound; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BookingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BookingController = _classThis;
}();
exports.BookingController = BookingController;
