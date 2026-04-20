"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
exports.BookingService = void 0;
var common_1 = require("@nestjs/common");
var booking_schema_1 = require("../schemas/booking.schema");
var axios_1 = require("axios");
var BookingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BookingService = _classThis = /** @class */ (function () {
        function BookingService_1(bookingModel, redisService, rabbitMQService, httpService, configService) {
            this.bookingModel = bookingModel;
            this.redisService = redisService;
            this.rabbitMQService = rabbitMQService;
            this.httpService = httpService;
            this.configService = configService;
            this.logger = new common_1.Logger(BookingService.name);
            this.NEARBY_RADIUS = 5000; // 5km
        }
        // Gọi Pricing Service để lấy giá
        BookingService_1.prototype.getPriceFromPricing = function (createDto) {
            return __awaiter(this, void 0, void 0, function () {
                var pricingUrl, response, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            pricingUrl = this.configService.get('PRICING_SERVICE_URL', 'http://localhost:3008');
                            this.logger.log("Calling pricing service at: ".concat(pricingUrl, "/api/v1/pricing/calculate"));
                            return [4 /*yield*/, axios_1.default.post("".concat(pricingUrl, "/api/v1/pricing/calculate"), {
                                    vehicleType: createDto.vehicleType,
                                    pickupLocation: createDto.pickupLocation,
                                    dropoffLocation: createDto.dropoffLocation,
                                    distance: createDto.distance,
                                    duration: createDto.duration || 0,
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    timeout: 10000,
                                })];
                        case 1:
                            response = _a.sent();
                            this.logger.log("Price from pricing service: ".concat(JSON.stringify(response.data)));
                            return [2 /*return*/, response.data];
                        case 2:
                            error_1 = _a.sent();
                            this.logger.error("Error calling pricing service: ".concat(error_1.message));
                            // Fallback: tự tính giá nếu pricing service lỗi
                            return [2 /*return*/, this.calculatePriceFallback(createDto)];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        // Tính giá fallback (khi pricing service lỗi)
        BookingService_1.prototype.calculatePriceFallback = function (createDto) {
            return __awaiter(this, void 0, void 0, function () {
                var basePrices, perKmPrices, basePrice, perKmPrice, distancePrice, timePrice, total;
                var _a, _b;
                return __generator(this, function (_c) {
                    basePrices = (_a = {},
                        _a[booking_schema_1.VehicleType.MOTORBIKE] = 10000,
                        _a[booking_schema_1.VehicleType.CAR_4] = 20000,
                        _a[booking_schema_1.VehicleType.CAR_7] = 25000,
                        _a);
                    perKmPrices = (_b = {},
                        _b[booking_schema_1.VehicleType.MOTORBIKE] = 5000,
                        _b[booking_schema_1.VehicleType.CAR_4] = 10000,
                        _b[booking_schema_1.VehicleType.CAR_7] = 12000,
                        _b);
                    basePrice = basePrices[createDto.vehicleType] || 20000;
                    perKmPrice = perKmPrices[createDto.vehicleType] || 10000;
                    distancePrice = createDto.distance * perKmPrice;
                    timePrice = (createDto.duration || 0) * 1000;
                    total = basePrice + distancePrice + timePrice;
                    return [2 /*return*/, {
                            basePrice: basePrice,
                            distancePrice: distancePrice,
                            timePrice: timePrice,
                            surgeMultiplier: 1,
                            total: total,
                            currency: 'VND',
                        }];
                });
            });
        };
        BookingService_1.prototype.createBooking = function (customerId, createDto) {
            return __awaiter(this, void 0, void 0, function () {
                var estimatedPrice, booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Creating booking for customer: ".concat(customerId));
                            return [4 /*yield*/, this.getPriceFromPricing(createDto)];
                        case 1:
                            estimatedPrice = _a.sent();
                            booking = new this.bookingModel({
                                customerId: customerId,
                                pickupLocation: createDto.pickupLocation,
                                dropoffLocation: createDto.dropoffLocation,
                                waypoints: createDto.waypoints || [],
                                vehicleType: createDto.vehicleType,
                                paymentMethod: createDto.paymentMethod || 'cash',
                                distance: createDto.distance,
                                duration: createDto.duration,
                                status: booking_schema_1.BookingStatus.PENDING,
                                estimatedPrice: estimatedPrice,
                                trackingPath: [],
                            });
                            return [4 /*yield*/, booking.save()];
                        case 2:
                            _a.sent();
                            this.logger.log("Booking created with ID: ".concat(booking._id));
                            // 3. Gửi sự kiện booking.created
                            return [4 /*yield*/, this.rabbitMQService.publish('booking.events', 'booking.created', {
                                    bookingId: booking._id.toString(),
                                    customerId: customerId,
                                    pickupLocation: createDto.pickupLocation,
                                    dropoffLocation: createDto.dropoffLocation,
                                    vehicleType: createDto.vehicleType,
                                    estimatedPrice: estimatedPrice,
                                    distance: createDto.distance,
                                    timestamp: new Date().toISOString(),
                                }, {
                                    correlationId: "booking_".concat(booking._id),
                                })];
                        case 3:
                            // 3. Gửi sự kiện booking.created
                            _a.sent();
                            return [2 /*return*/, this.mapToResponse(booking)];
                    }
                });
            });
        };
        BookingService_1.prototype.findNearbyDrivers = function (lat, lng) {
            return __awaiter(this, void 0, void 0, function () {
                var driverServiceUrl, apiKey, response, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            driverServiceUrl = this.configService.get('DRIVER_SERVICE_URL', 'http://localhost:3003');
                            apiKey = this.configService.get('INTERNAL_API_KEY', 'internal-key');
                            this.logger.log("Calling driver service at: ".concat(driverServiceUrl, "/api/v1/internal/drivers/nearby?lat=").concat(lat, "&lng=").concat(lng, "&radius=5000"));
                            return [4 /*yield*/, axios_1.default.get("".concat(driverServiceUrl, "/api/v1/internal/drivers/nearby"), {
                                    params: {
                                        lat: lat,
                                        lng: lng,
                                        radius: 5000,
                                    },
                                    headers: {
                                        'x-service-id': 'booking-service',
                                        'x-internal-key': apiKey,
                                    },
                                    timeout: 5000,
                                })];
                        case 1:
                            response = _a.sent();
                            this.logger.log("Found ".concat(response.data.length, " nearby drivers"));
                            return [2 /*return*/, response.data];
                        case 2:
                            error_2 = _a.sent();
                            this.logger.error("Error finding nearby drivers: ".concat(error_2.message));
                            if (error_2.response) {
                                this.logger.error("Status: ".concat(error_2.response.status));
                                this.logger.error("Data: ".concat(JSON.stringify(error_2.response.data)));
                            }
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        BookingService_1.prototype.acceptBooking = function (bookingId, acceptDto) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Driver ".concat(acceptDto.driverId, " accepting booking: ").concat(bookingId));
                            return [4 /*yield*/, this.bookingModel.findById(bookingId)];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new common_1.NotFoundException('Booking not found');
                            }
                            if (booking.status !== booking_schema_1.BookingStatus.PENDING) {
                                throw new common_1.BadRequestException('Booking is not available for acceptance');
                            }
                            // 1. Cập nhật trạng thái booking
                            booking.driverId = acceptDto.driverId;
                            booking.status = booking_schema_1.BookingStatus.CONFIRMED;
                            booking.pickupTime = new Date(Date.now() + (acceptDto.eta || 5) * 60000);
                            return [4 /*yield*/, booking.save()];
                        case 2:
                            _a.sent();
                            // 2. Gửi sự kiện booking.accepted với đầy đủ dữ liệu cho Ride Service
                            return [4 /*yield*/, this.rabbitMQService.publish('booking.events', 'booking.accepted', {
                                    id: booking._id.toString(),
                                    bookingId: booking._id.toString(),
                                    customerId: booking.customerId,
                                    driverId: acceptDto.driverId,
                                    pickupLocation: booking.pickupLocation,
                                    dropoffLocation: booking.dropoffLocation,
                                    estimatedPrice: booking.estimatedPrice,
                                    distance: booking.distance,
                                    duration: booking.duration,
                                    waypoints: booking.waypoints || [],
                                    eta: acceptDto.eta || 5,
                                    timestamp: new Date().toISOString(),
                                })];
                        case 3:
                            // 2. Gửi sự kiện booking.accepted với đầy đủ dữ liệu cho Ride Service
                            _a.sent();
                            this.logger.log("\u2705 Event booking.accepted published for booking: ".concat(bookingId));
                            return [2 /*return*/, this.mapToResponse(booking)];
                    }
                });
            });
        };
        BookingService_1.prototype.updateStatus = function (bookingId, updateDto) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, oldStatus, newStatus;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.bookingModel.findById(bookingId)];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new common_1.NotFoundException('Booking not found');
                            }
                            oldStatus = booking.status;
                            newStatus = updateDto.status;
                            this.validateStatusTransition(oldStatus, newStatus);
                            booking.status = newStatus;
                            switch (newStatus) {
                                case booking_schema_1.BookingStatus.PICKING_UP:
                                    break;
                                case booking_schema_1.BookingStatus.IN_PROGRESS:
                                    booking.startTime = new Date();
                                    break;
                                case booking_schema_1.BookingStatus.COMPLETED:
                                    booking.endTime = new Date();
                                    booking.isPaid = booking.paymentMethod === 'cash';
                                    break;
                                case booking_schema_1.BookingStatus.CANCELLED:
                                    booking.cancellation = {
                                        cancelledBy: booking.driverId ? 'driver' : 'customer',
                                        reason: updateDto.reason || 'No reason provided',
                                        cancelledAt: new Date(),
                                    };
                                    break;
                            }
                            return [4 /*yield*/, booking.save()];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.rabbitMQService.publish('booking.events', "booking.".concat(newStatus), {
                                    bookingId: booking._id.toString(),
                                    customerId: booking.customerId,
                                    driverId: booking.driverId,
                                    oldStatus: oldStatus,
                                    newStatus: newStatus,
                                    timestamp: new Date().toISOString(),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.mapToResponse(booking)];
                    }
                });
            });
        };
        BookingService_1.prototype.updateLocation = function (bookingId, driverId, location) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.bookingModel.findOne({
                                _id: bookingId,
                                driverId: driverId,
                                status: { $in: [booking_schema_1.BookingStatus.CONFIRMED, booking_schema_1.BookingStatus.PICKING_UP, booking_schema_1.BookingStatus.IN_PROGRESS] },
                            })];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new common_1.NotFoundException('Active booking not found for this driver');
                            }
                            booking.trackingPath.push(__assign(__assign({}, location), { timestamp: new Date() }));
                            if (booking.trackingPath.length > 100) {
                                booking.trackingPath = booking.trackingPath.slice(-100);
                            }
                            return [4 /*yield*/, booking.save()];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        BookingService_1.prototype.getBooking = function (bookingId, userId, role) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.bookingModel.findById(bookingId)];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new common_1.NotFoundException('Booking not found');
                            }
                            if (role === 'customer' && booking.customerId !== userId) {
                                throw new common_1.BadRequestException('You do not have permission to view this booking');
                            }
                            if (role === 'driver' && booking.driverId !== userId) {
                                throw new common_1.BadRequestException('You do not have permission to view this booking');
                            }
                            return [2 /*return*/, this.mapToResponse(booking)];
                    }
                });
            });
        };
        BookingService_1.prototype.getCustomerBookings = function (customerId_1) {
            return __awaiter(this, arguments, void 0, function (customerId, page, limit) {
                var skip, _a, bookings, total;
                var _this = this;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 10; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, Promise.all([
                                    this.bookingModel
                                        .find({ customerId: customerId })
                                        .sort({ createdAt: -1 })
                                        .skip(skip)
                                        .limit(limit)
                                        .exec(),
                                    this.bookingModel.countDocuments({ customerId: customerId }),
                                ])];
                        case 1:
                            _a = _b.sent(), bookings = _a[0], total = _a[1];
                            return [2 /*return*/, {
                                    data: bookings.map(function (b) { return _this.mapToResponse(b); }),
                                    total: total,
                                    page: page,
                                    totalPages: Math.ceil(total / limit),
                                }];
                    }
                });
            });
        };
        BookingService_1.prototype.getDriverBookings = function (driverId_1) {
            return __awaiter(this, arguments, void 0, function (driverId, page, limit) {
                var skip, _a, bookings, total;
                var _this = this;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 10; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, Promise.all([
                                    this.bookingModel
                                        .find({ driverId: driverId })
                                        .sort({ createdAt: -1 })
                                        .skip(skip)
                                        .limit(limit)
                                        .exec(),
                                    this.bookingModel.countDocuments({ driverId: driverId }),
                                ])];
                        case 1:
                            _a = _b.sent(), bookings = _a[0], total = _a[1];
                            return [2 /*return*/, {
                                    data: bookings.map(function (b) { return _this.mapToResponse(b); }),
                                    total: total,
                                    page: page,
                                    totalPages: Math.ceil(total / limit),
                                }];
                    }
                });
            });
        };
        BookingService_1.prototype.validateStatusTransition = function (oldStatus, newStatus) {
            var _a;
            var _b;
            var validTransitions = (_a = {},
                _a[booking_schema_1.BookingStatus.PENDING] = [booking_schema_1.BookingStatus.CONFIRMED, booking_schema_1.BookingStatus.CANCELLED, booking_schema_1.BookingStatus.NO_DRIVER],
                _a[booking_schema_1.BookingStatus.CONFIRMED] = [booking_schema_1.BookingStatus.PICKING_UP, booking_schema_1.BookingStatus.CANCELLED],
                _a[booking_schema_1.BookingStatus.PICKING_UP] = [booking_schema_1.BookingStatus.IN_PROGRESS, booking_schema_1.BookingStatus.CANCELLED],
                _a[booking_schema_1.BookingStatus.IN_PROGRESS] = [booking_schema_1.BookingStatus.COMPLETED],
                _a[booking_schema_1.BookingStatus.COMPLETED] = [],
                _a[booking_schema_1.BookingStatus.CANCELLED] = [],
                _a[booking_schema_1.BookingStatus.NO_DRIVER] = [booking_schema_1.BookingStatus.PENDING],
                _a);
            if (!((_b = validTransitions[oldStatus]) === null || _b === void 0 ? void 0 : _b.includes(newStatus))) {
                throw new common_1.BadRequestException("Invalid status transition from ".concat(oldStatus, " to ").concat(newStatus));
            }
        };
        BookingService_1.prototype.mapToResponse = function (booking) {
            var obj = booking.toObject();
            return {
                id: obj._id.toString(),
                customerId: obj.customerId,
                driverId: obj.driverId,
                pickupLocation: obj.pickupLocation,
                dropoffLocation: obj.dropoffLocation,
                waypoints: obj.waypoints,
                status: obj.status,
                vehicleType: obj.vehicleType,
                price: obj.price,
                distance: obj.distance,
                duration: obj.duration,
                paymentMethod: obj.paymentMethod,
                estimatedPrice: obj.estimatedPrice,
                pickupTime: obj.pickupTime,
                startTime: obj.startTime,
                endTime: obj.endTime,
                trackingPath: obj.trackingPath,
                cancellation: obj.cancellation,
                createdAt: obj.createdAt,
                updatedAt: obj.updatedAt,
            };
        };
        BookingService_1.prototype.assignDriver = function (bookingId, driverId, eta) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.bookingModel.findById(bookingId)];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new common_1.NotFoundException('Booking not found');
                            }
                            booking.driverId = driverId;
                            booking.status = booking_schema_1.BookingStatus.CONFIRMED;
                            booking.pickupTime = new Date(Date.now() + (eta || 5) * 60000);
                            return [4 /*yield*/, booking.save()];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.rabbitMQService.publish('booking.events', 'booking.accepted', {
                                    bookingId: booking._id.toString(),
                                    customerId: booking.customerId,
                                    driverId: driverId,
                                    pickupLocation: booking.pickupLocation,
                                    dropoffLocation: booking.dropoffLocation,
                                    price: booking.price,
                                    distance: booking.distance,
                                    eta: eta || 5,
                                    timestamp: new Date().toISOString(),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.mapToResponse(booking)];
                    }
                });
            });
        };
        return BookingService_1;
    }());
    __setFunctionName(_classThis, "BookingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BookingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BookingService = _classThis;
}();
exports.BookingService = BookingService;
