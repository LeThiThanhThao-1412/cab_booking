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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingResponseDto = exports.UpdateLocationDto = exports.TrackingPointDto = exports.UpdateStatusDto = exports.AcceptBookingDto = exports.CreateBookingDto = exports.LocationDto = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var booking_schema_1 = require("../schemas/booking.schema");
var LocationDto = function () {
    var _a;
    var _lat_decorators;
    var _lat_initializers = [];
    var _lat_extraInitializers = [];
    var _lng_decorators;
    var _lng_initializers = [];
    var _lng_extraInitializers = [];
    var _address_decorators;
    var _address_initializers = [];
    var _address_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    return _a = /** @class */ (function () {
            function LocationDto() {
                this.lat = __runInitializers(this, _lat_initializers, void 0);
                this.lng = (__runInitializers(this, _lat_extraInitializers), __runInitializers(this, _lng_initializers, void 0));
                this.address = (__runInitializers(this, _lng_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.name = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                __runInitializers(this, _name_extraInitializers);
            }
            return LocationDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _lat_decorators = [(0, class_validator_1.IsLatitude)()];
            _lng_decorators = [(0, class_validator_1.IsLongitude)()];
            _address_decorators = [(0, class_validator_1.IsString)()];
            _name_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _lat_decorators, { kind: "field", name: "lat", static: false, private: false, access: { has: function (obj) { return "lat" in obj; }, get: function (obj) { return obj.lat; }, set: function (obj, value) { obj.lat = value; } }, metadata: _metadata }, _lat_initializers, _lat_extraInitializers);
            __esDecorate(null, null, _lng_decorators, { kind: "field", name: "lng", static: false, private: false, access: { has: function (obj) { return "lng" in obj; }, get: function (obj) { return obj.lng; }, set: function (obj, value) { obj.lng = value; } }, metadata: _metadata }, _lng_initializers, _lng_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: function (obj) { return "address" in obj; }, get: function (obj) { return obj.address; }, set: function (obj, value) { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.LocationDto = LocationDto;
var CreateBookingDto = function () {
    var _a;
    var _pickupLocation_decorators;
    var _pickupLocation_initializers = [];
    var _pickupLocation_extraInitializers = [];
    var _dropoffLocation_decorators;
    var _dropoffLocation_initializers = [];
    var _dropoffLocation_extraInitializers = [];
    var _waypoints_decorators;
    var _waypoints_initializers = [];
    var _waypoints_extraInitializers = [];
    var _vehicleType_decorators;
    var _vehicleType_initializers = [];
    var _vehicleType_extraInitializers = [];
    var _paymentMethod_decorators;
    var _paymentMethod_initializers = [];
    var _paymentMethod_extraInitializers = [];
    var _distance_decorators;
    var _distance_initializers = [];
    var _distance_extraInitializers = [];
    var _duration_decorators;
    var _duration_initializers = [];
    var _duration_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateBookingDto() {
                this.pickupLocation = __runInitializers(this, _pickupLocation_initializers, void 0);
                this.dropoffLocation = (__runInitializers(this, _pickupLocation_extraInitializers), __runInitializers(this, _dropoffLocation_initializers, void 0));
                this.waypoints = (__runInitializers(this, _dropoffLocation_extraInitializers), __runInitializers(this, _waypoints_initializers, void 0));
                this.vehicleType = (__runInitializers(this, _waypoints_extraInitializers), __runInitializers(this, _vehicleType_initializers, void 0));
                this.paymentMethod = (__runInitializers(this, _vehicleType_extraInitializers), __runInitializers(this, _paymentMethod_initializers, void 0));
                this.distance = (__runInitializers(this, _paymentMethod_extraInitializers), __runInitializers(this, _distance_initializers, void 0)); // km
                this.duration = (__runInitializers(this, _distance_extraInitializers), __runInitializers(this, _duration_initializers, void 0)); // phút
                __runInitializers(this, _duration_extraInitializers);
            }
            return CreateBookingDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _pickupLocation_decorators = [(0, class_validator_1.ValidateNested)(), (0, class_transformer_1.Type)(function () { return LocationDto; })];
            _dropoffLocation_decorators = [(0, class_validator_1.ValidateNested)(), (0, class_transformer_1.Type)(function () { return LocationDto; })];
            _waypoints_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return LocationDto; })];
            _vehicleType_decorators = [(0, class_validator_1.IsEnum)(booking_schema_1.VehicleType)];
            _paymentMethod_decorators = [(0, class_validator_1.IsEnum)(booking_schema_1.PaymentMethod), (0, class_validator_1.IsOptional)()];
            _distance_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.1), (0, class_validator_1.Max)(1000)];
            _duration_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1)];
            __esDecorate(null, null, _pickupLocation_decorators, { kind: "field", name: "pickupLocation", static: false, private: false, access: { has: function (obj) { return "pickupLocation" in obj; }, get: function (obj) { return obj.pickupLocation; }, set: function (obj, value) { obj.pickupLocation = value; } }, metadata: _metadata }, _pickupLocation_initializers, _pickupLocation_extraInitializers);
            __esDecorate(null, null, _dropoffLocation_decorators, { kind: "field", name: "dropoffLocation", static: false, private: false, access: { has: function (obj) { return "dropoffLocation" in obj; }, get: function (obj) { return obj.dropoffLocation; }, set: function (obj, value) { obj.dropoffLocation = value; } }, metadata: _metadata }, _dropoffLocation_initializers, _dropoffLocation_extraInitializers);
            __esDecorate(null, null, _waypoints_decorators, { kind: "field", name: "waypoints", static: false, private: false, access: { has: function (obj) { return "waypoints" in obj; }, get: function (obj) { return obj.waypoints; }, set: function (obj, value) { obj.waypoints = value; } }, metadata: _metadata }, _waypoints_initializers, _waypoints_extraInitializers);
            __esDecorate(null, null, _vehicleType_decorators, { kind: "field", name: "vehicleType", static: false, private: false, access: { has: function (obj) { return "vehicleType" in obj; }, get: function (obj) { return obj.vehicleType; }, set: function (obj, value) { obj.vehicleType = value; } }, metadata: _metadata }, _vehicleType_initializers, _vehicleType_extraInitializers);
            __esDecorate(null, null, _paymentMethod_decorators, { kind: "field", name: "paymentMethod", static: false, private: false, access: { has: function (obj) { return "paymentMethod" in obj; }, get: function (obj) { return obj.paymentMethod; }, set: function (obj, value) { obj.paymentMethod = value; } }, metadata: _metadata }, _paymentMethod_initializers, _paymentMethod_extraInitializers);
            __esDecorate(null, null, _distance_decorators, { kind: "field", name: "distance", static: false, private: false, access: { has: function (obj) { return "distance" in obj; }, get: function (obj) { return obj.distance; }, set: function (obj, value) { obj.distance = value; } }, metadata: _metadata }, _distance_initializers, _distance_extraInitializers);
            __esDecorate(null, null, _duration_decorators, { kind: "field", name: "duration", static: false, private: false, access: { has: function (obj) { return "duration" in obj; }, get: function (obj) { return obj.duration; }, set: function (obj, value) { obj.duration = value; } }, metadata: _metadata }, _duration_initializers, _duration_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateBookingDto = CreateBookingDto;
var AcceptBookingDto = function () {
    var _a;
    var _driverId_decorators;
    var _driverId_initializers = [];
    var _driverId_extraInitializers = [];
    var _eta_decorators;
    var _eta_initializers = [];
    var _eta_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AcceptBookingDto() {
                this.driverId = __runInitializers(this, _driverId_initializers, void 0);
                this.eta = (__runInitializers(this, _driverId_extraInitializers), __runInitializers(this, _eta_initializers, void 0)); // phút
                __runInitializers(this, _eta_extraInitializers);
            }
            return AcceptBookingDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _driverId_decorators = [(0, class_validator_1.IsString)()];
            _eta_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _driverId_decorators, { kind: "field", name: "driverId", static: false, private: false, access: { has: function (obj) { return "driverId" in obj; }, get: function (obj) { return obj.driverId; }, set: function (obj, value) { obj.driverId = value; } }, metadata: _metadata }, _driverId_initializers, _driverId_extraInitializers);
            __esDecorate(null, null, _eta_decorators, { kind: "field", name: "eta", static: false, private: false, access: { has: function (obj) { return "eta" in obj; }, get: function (obj) { return obj.eta; }, set: function (obj, value) { obj.eta = value; } }, metadata: _metadata }, _eta_initializers, _eta_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AcceptBookingDto = AcceptBookingDto;
var UpdateStatusDto = function () {
    var _a;
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateStatusDto() {
                this.status = __runInitializers(this, _status_initializers, void 0);
                this.reason = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _reason_initializers, void 0)); // lý do hủy
                __runInitializers(this, _reason_extraInitializers);
            }
            return UpdateStatusDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _status_decorators = [(0, class_validator_1.IsEnum)(['picking_up', 'in_progress', 'completed', 'cancelled'])];
            _reason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateStatusDto = UpdateStatusDto;
var TrackingPointDto = function () {
    var _a;
    var _lat_decorators;
    var _lat_initializers = [];
    var _lat_extraInitializers = [];
    var _lng_decorators;
    var _lng_initializers = [];
    var _lng_extraInitializers = [];
    var _speed_decorators;
    var _speed_initializers = [];
    var _speed_extraInitializers = [];
    var _heading_decorators;
    var _heading_initializers = [];
    var _heading_extraInitializers = [];
    return _a = /** @class */ (function () {
            function TrackingPointDto() {
                this.lat = __runInitializers(this, _lat_initializers, void 0);
                this.lng = (__runInitializers(this, _lat_extraInitializers), __runInitializers(this, _lng_initializers, void 0));
                this.speed = (__runInitializers(this, _lng_extraInitializers), __runInitializers(this, _speed_initializers, void 0));
                this.heading = (__runInitializers(this, _speed_extraInitializers), __runInitializers(this, _heading_initializers, void 0));
                __runInitializers(this, _heading_extraInitializers);
            }
            return TrackingPointDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _lat_decorators = [(0, class_validator_1.IsLatitude)()];
            _lng_decorators = [(0, class_validator_1.IsLongitude)()];
            _speed_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _heading_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            __esDecorate(null, null, _lat_decorators, { kind: "field", name: "lat", static: false, private: false, access: { has: function (obj) { return "lat" in obj; }, get: function (obj) { return obj.lat; }, set: function (obj, value) { obj.lat = value; } }, metadata: _metadata }, _lat_initializers, _lat_extraInitializers);
            __esDecorate(null, null, _lng_decorators, { kind: "field", name: "lng", static: false, private: false, access: { has: function (obj) { return "lng" in obj; }, get: function (obj) { return obj.lng; }, set: function (obj, value) { obj.lng = value; } }, metadata: _metadata }, _lng_initializers, _lng_extraInitializers);
            __esDecorate(null, null, _speed_decorators, { kind: "field", name: "speed", static: false, private: false, access: { has: function (obj) { return "speed" in obj; }, get: function (obj) { return obj.speed; }, set: function (obj, value) { obj.speed = value; } }, metadata: _metadata }, _speed_initializers, _speed_extraInitializers);
            __esDecorate(null, null, _heading_decorators, { kind: "field", name: "heading", static: false, private: false, access: { has: function (obj) { return "heading" in obj; }, get: function (obj) { return obj.heading; }, set: function (obj, value) { obj.heading = value; } }, metadata: _metadata }, _heading_initializers, _heading_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.TrackingPointDto = TrackingPointDto;
var UpdateLocationDto = function () {
    var _a;
    var _location_decorators;
    var _location_initializers = [];
    var _location_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateLocationDto() {
                this.location = __runInitializers(this, _location_initializers, void 0);
                __runInitializers(this, _location_extraInitializers);
            }
            return UpdateLocationDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _location_decorators = [(0, class_validator_1.ValidateNested)(), (0, class_transformer_1.Type)(function () { return TrackingPointDto; })];
            __esDecorate(null, null, _location_decorators, { kind: "field", name: "location", static: false, private: false, access: { has: function (obj) { return "location" in obj; }, get: function (obj) { return obj.location; }, set: function (obj, value) { obj.location = value; } }, metadata: _metadata }, _location_initializers, _location_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateLocationDto = UpdateLocationDto;
var BookingResponseDto = /** @class */ (function () {
    function BookingResponseDto() {
    }
    return BookingResponseDto;
}());
exports.BookingResponseDto = BookingResponseDto;
