"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingSchema = exports.Booking = exports.PaymentMethod = exports.VehicleType = exports.BookingStatus = void 0;
var mongoose_1 = require("@nestjs/mongoose");
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["PICKING_UP"] = "picking_up";
    BookingStatus["IN_PROGRESS"] = "in_progress";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["NO_DRIVER"] = "no_driver";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["CAR_4"] = "car_4";
    VehicleType["CAR_7"] = "car_7";
    VehicleType["MOTORBIKE"] = "motorbike";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["WALLET"] = "wallet";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var Booking = function () {
    var _classDecorators = [(0, mongoose_1.Schema)({ timestamps: true, collection: 'bookings' })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _customerId_decorators;
    var _customerId_initializers = [];
    var _customerId_extraInitializers = [];
    var _driverId_decorators;
    var _driverId_initializers = [];
    var _driverId_extraInitializers = [];
    var _pickupLocation_decorators;
    var _pickupLocation_initializers = [];
    var _pickupLocation_extraInitializers = [];
    var _dropoffLocation_decorators;
    var _dropoffLocation_initializers = [];
    var _dropoffLocation_extraInitializers = [];
    var _waypoints_decorators;
    var _waypoints_initializers = [];
    var _waypoints_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _vehicleType_decorators;
    var _vehicleType_initializers = [];
    var _vehicleType_extraInitializers = [];
    var _price_decorators;
    var _price_initializers = [];
    var _price_extraInitializers = [];
    var _distance_decorators;
    var _distance_initializers = [];
    var _distance_extraInitializers = [];
    var _duration_decorators;
    var _duration_initializers = [];
    var _duration_extraInitializers = [];
    var _paymentMethod_decorators;
    var _paymentMethod_initializers = [];
    var _paymentMethod_extraInitializers = [];
    var _estimatedPrice_decorators;
    var _estimatedPrice_initializers = [];
    var _estimatedPrice_extraInitializers = [];
    var _pickupTime_decorators;
    var _pickupTime_initializers = [];
    var _pickupTime_extraInitializers = [];
    var _startTime_decorators;
    var _startTime_initializers = [];
    var _startTime_extraInitializers = [];
    var _endTime_decorators;
    var _endTime_initializers = [];
    var _endTime_extraInitializers = [];
    var _trackingPath_decorators;
    var _trackingPath_initializers = [];
    var _trackingPath_extraInitializers = [];
    var _cancellation_decorators;
    var _cancellation_initializers = [];
    var _cancellation_extraInitializers = [];
    var _rating_decorators;
    var _rating_initializers = [];
    var _rating_extraInitializers = [];
    var _isPaid_decorators;
    var _isPaid_initializers = [];
    var _isPaid_extraInitializers = [];
    var _paymentId_decorators;
    var _paymentId_initializers = [];
    var _paymentId_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Booking = _classThis = /** @class */ (function () {
        function Booking_1() {
            this.customerId = __runInitializers(this, _customerId_initializers, void 0);
            this.driverId = (__runInitializers(this, _customerId_extraInitializers), __runInitializers(this, _driverId_initializers, void 0));
            this.pickupLocation = (__runInitializers(this, _driverId_extraInitializers), __runInitializers(this, _pickupLocation_initializers, void 0));
            this.dropoffLocation = (__runInitializers(this, _pickupLocation_extraInitializers), __runInitializers(this, _dropoffLocation_initializers, void 0));
            this.waypoints = (__runInitializers(this, _dropoffLocation_extraInitializers), __runInitializers(this, _waypoints_initializers, void 0));
            this.status = (__runInitializers(this, _waypoints_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.vehicleType = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _vehicleType_initializers, void 0));
            this.price = (__runInitializers(this, _vehicleType_extraInitializers), __runInitializers(this, _price_initializers, void 0));
            this.distance = (__runInitializers(this, _price_extraInitializers), __runInitializers(this, _distance_initializers, void 0)); // km
            this.duration = (__runInitializers(this, _distance_extraInitializers), __runInitializers(this, _duration_initializers, void 0)); // phút
            this.paymentMethod = (__runInitializers(this, _duration_extraInitializers), __runInitializers(this, _paymentMethod_initializers, void 0));
            this.estimatedPrice = (__runInitializers(this, _paymentMethod_extraInitializers), __runInitializers(this, _estimatedPrice_initializers, void 0));
            this.pickupTime = (__runInitializers(this, _estimatedPrice_extraInitializers), __runInitializers(this, _pickupTime_initializers, void 0));
            this.startTime = (__runInitializers(this, _pickupTime_extraInitializers), __runInitializers(this, _startTime_initializers, void 0));
            this.endTime = (__runInitializers(this, _startTime_extraInitializers), __runInitializers(this, _endTime_initializers, void 0));
            this.trackingPath = (__runInitializers(this, _endTime_extraInitializers), __runInitializers(this, _trackingPath_initializers, void 0));
            this.cancellation = (__runInitializers(this, _trackingPath_extraInitializers), __runInitializers(this, _cancellation_initializers, void 0));
            this.rating = (__runInitializers(this, _cancellation_extraInitializers), __runInitializers(this, _rating_initializers, void 0));
            this.isPaid = (__runInitializers(this, _rating_extraInitializers), __runInitializers(this, _isPaid_initializers, void 0));
            this.paymentId = (__runInitializers(this, _isPaid_extraInitializers), __runInitializers(this, _paymentId_initializers, void 0));
            this.metadata = (__runInitializers(this, _paymentId_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
            this.createdAt = (__runInitializers(this, _metadata_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Booking_1;
    }());
    __setFunctionName(_classThis, "Booking");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _customerId_decorators = [(0, mongoose_1.Prop)({ required: true, index: true })];
        _driverId_decorators = [(0, mongoose_1.Prop)({ index: true })];
        _pickupLocation_decorators = [(0, mongoose_1.Prop)({ required: true, type: Object })];
        _dropoffLocation_decorators = [(0, mongoose_1.Prop)({ required: true, type: Object })];
        _waypoints_decorators = [(0, mongoose_1.Prop)({ type: Array })];
        _status_decorators = [(0, mongoose_1.Prop)({ required: true, type: String, enum: BookingStatus, default: BookingStatus.PENDING })];
        _vehicleType_decorators = [(0, mongoose_1.Prop)({ required: true, type: String, enum: VehicleType })];
        _price_decorators = [(0, mongoose_1.Prop)({ type: Object })];
        _distance_decorators = [(0, mongoose_1.Prop)({ required: true })];
        _duration_decorators = [(0, mongoose_1.Prop)()];
        _paymentMethod_decorators = [(0, mongoose_1.Prop)({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })];
        _estimatedPrice_decorators = [(0, mongoose_1.Prop)({ type: Object })];
        _pickupTime_decorators = [(0, mongoose_1.Prop)({ type: Date })];
        _startTime_decorators = [(0, mongoose_1.Prop)({ type: Date })];
        _endTime_decorators = [(0, mongoose_1.Prop)({ type: Date })];
        _trackingPath_decorators = [(0, mongoose_1.Prop)({ type: Array })];
        _cancellation_decorators = [(0, mongoose_1.Prop)({ type: Object })];
        _rating_decorators = [(0, mongoose_1.Prop)({ type: Object })];
        _isPaid_decorators = [(0, mongoose_1.Prop)({ default: false })];
        _paymentId_decorators = [(0, mongoose_1.Prop)()];
        _metadata_decorators = [(0, mongoose_1.Prop)({ type: Object })];
        _createdAt_decorators = [(0, mongoose_1.Prop)({ type: Date, default: Date.now })];
        _updatedAt_decorators = [(0, mongoose_1.Prop)({ type: Date, default: Date.now })];
        __esDecorate(null, null, _customerId_decorators, { kind: "field", name: "customerId", static: false, private: false, access: { has: function (obj) { return "customerId" in obj; }, get: function (obj) { return obj.customerId; }, set: function (obj, value) { obj.customerId = value; } }, metadata: _metadata }, _customerId_initializers, _customerId_extraInitializers);
        __esDecorate(null, null, _driverId_decorators, { kind: "field", name: "driverId", static: false, private: false, access: { has: function (obj) { return "driverId" in obj; }, get: function (obj) { return obj.driverId; }, set: function (obj, value) { obj.driverId = value; } }, metadata: _metadata }, _driverId_initializers, _driverId_extraInitializers);
        __esDecorate(null, null, _pickupLocation_decorators, { kind: "field", name: "pickupLocation", static: false, private: false, access: { has: function (obj) { return "pickupLocation" in obj; }, get: function (obj) { return obj.pickupLocation; }, set: function (obj, value) { obj.pickupLocation = value; } }, metadata: _metadata }, _pickupLocation_initializers, _pickupLocation_extraInitializers);
        __esDecorate(null, null, _dropoffLocation_decorators, { kind: "field", name: "dropoffLocation", static: false, private: false, access: { has: function (obj) { return "dropoffLocation" in obj; }, get: function (obj) { return obj.dropoffLocation; }, set: function (obj, value) { obj.dropoffLocation = value; } }, metadata: _metadata }, _dropoffLocation_initializers, _dropoffLocation_extraInitializers);
        __esDecorate(null, null, _waypoints_decorators, { kind: "field", name: "waypoints", static: false, private: false, access: { has: function (obj) { return "waypoints" in obj; }, get: function (obj) { return obj.waypoints; }, set: function (obj, value) { obj.waypoints = value; } }, metadata: _metadata }, _waypoints_initializers, _waypoints_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _vehicleType_decorators, { kind: "field", name: "vehicleType", static: false, private: false, access: { has: function (obj) { return "vehicleType" in obj; }, get: function (obj) { return obj.vehicleType; }, set: function (obj, value) { obj.vehicleType = value; } }, metadata: _metadata }, _vehicleType_initializers, _vehicleType_extraInitializers);
        __esDecorate(null, null, _price_decorators, { kind: "field", name: "price", static: false, private: false, access: { has: function (obj) { return "price" in obj; }, get: function (obj) { return obj.price; }, set: function (obj, value) { obj.price = value; } }, metadata: _metadata }, _price_initializers, _price_extraInitializers);
        __esDecorate(null, null, _distance_decorators, { kind: "field", name: "distance", static: false, private: false, access: { has: function (obj) { return "distance" in obj; }, get: function (obj) { return obj.distance; }, set: function (obj, value) { obj.distance = value; } }, metadata: _metadata }, _distance_initializers, _distance_extraInitializers);
        __esDecorate(null, null, _duration_decorators, { kind: "field", name: "duration", static: false, private: false, access: { has: function (obj) { return "duration" in obj; }, get: function (obj) { return obj.duration; }, set: function (obj, value) { obj.duration = value; } }, metadata: _metadata }, _duration_initializers, _duration_extraInitializers);
        __esDecorate(null, null, _paymentMethod_decorators, { kind: "field", name: "paymentMethod", static: false, private: false, access: { has: function (obj) { return "paymentMethod" in obj; }, get: function (obj) { return obj.paymentMethod; }, set: function (obj, value) { obj.paymentMethod = value; } }, metadata: _metadata }, _paymentMethod_initializers, _paymentMethod_extraInitializers);
        __esDecorate(null, null, _estimatedPrice_decorators, { kind: "field", name: "estimatedPrice", static: false, private: false, access: { has: function (obj) { return "estimatedPrice" in obj; }, get: function (obj) { return obj.estimatedPrice; }, set: function (obj, value) { obj.estimatedPrice = value; } }, metadata: _metadata }, _estimatedPrice_initializers, _estimatedPrice_extraInitializers);
        __esDecorate(null, null, _pickupTime_decorators, { kind: "field", name: "pickupTime", static: false, private: false, access: { has: function (obj) { return "pickupTime" in obj; }, get: function (obj) { return obj.pickupTime; }, set: function (obj, value) { obj.pickupTime = value; } }, metadata: _metadata }, _pickupTime_initializers, _pickupTime_extraInitializers);
        __esDecorate(null, null, _startTime_decorators, { kind: "field", name: "startTime", static: false, private: false, access: { has: function (obj) { return "startTime" in obj; }, get: function (obj) { return obj.startTime; }, set: function (obj, value) { obj.startTime = value; } }, metadata: _metadata }, _startTime_initializers, _startTime_extraInitializers);
        __esDecorate(null, null, _endTime_decorators, { kind: "field", name: "endTime", static: false, private: false, access: { has: function (obj) { return "endTime" in obj; }, get: function (obj) { return obj.endTime; }, set: function (obj, value) { obj.endTime = value; } }, metadata: _metadata }, _endTime_initializers, _endTime_extraInitializers);
        __esDecorate(null, null, _trackingPath_decorators, { kind: "field", name: "trackingPath", static: false, private: false, access: { has: function (obj) { return "trackingPath" in obj; }, get: function (obj) { return obj.trackingPath; }, set: function (obj, value) { obj.trackingPath = value; } }, metadata: _metadata }, _trackingPath_initializers, _trackingPath_extraInitializers);
        __esDecorate(null, null, _cancellation_decorators, { kind: "field", name: "cancellation", static: false, private: false, access: { has: function (obj) { return "cancellation" in obj; }, get: function (obj) { return obj.cancellation; }, set: function (obj, value) { obj.cancellation = value; } }, metadata: _metadata }, _cancellation_initializers, _cancellation_extraInitializers);
        __esDecorate(null, null, _rating_decorators, { kind: "field", name: "rating", static: false, private: false, access: { has: function (obj) { return "rating" in obj; }, get: function (obj) { return obj.rating; }, set: function (obj, value) { obj.rating = value; } }, metadata: _metadata }, _rating_initializers, _rating_extraInitializers);
        __esDecorate(null, null, _isPaid_decorators, { kind: "field", name: "isPaid", static: false, private: false, access: { has: function (obj) { return "isPaid" in obj; }, get: function (obj) { return obj.isPaid; }, set: function (obj, value) { obj.isPaid = value; } }, metadata: _metadata }, _isPaid_initializers, _isPaid_extraInitializers);
        __esDecorate(null, null, _paymentId_decorators, { kind: "field", name: "paymentId", static: false, private: false, access: { has: function (obj) { return "paymentId" in obj; }, get: function (obj) { return obj.paymentId; }, set: function (obj, value) { obj.paymentId = value; } }, metadata: _metadata }, _paymentId_initializers, _paymentId_extraInitializers);
        __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Booking = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Booking = _classThis;
}();
exports.Booking = Booking;
exports.BookingSchema = mongoose_1.SchemaFactory.createForClass(Booking);
// Tạo indexes
exports.BookingSchema.index({ customerId: 1, createdAt: -1 });
exports.BookingSchema.index({ driverId: 1, status: 1 });
exports.BookingSchema.index({ status: 1, createdAt: 1 });
exports.BookingSchema.index({ 'pickupLocation.lat': 1, 'pickupLocation.lng': 1 });
