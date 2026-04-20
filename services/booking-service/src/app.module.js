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
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var jwt_1 = require("@nestjs/jwt");
var mongoose_1 = require("@nestjs/mongoose");
var axios_1 = require("@nestjs/axios");
var shared_1 = require("@cab-booking/shared");
var booking_controller_1 = require("./controllers/booking.controller");
var internal_controller_1 = require("./controllers/internal.controller");
var booking_service_1 = require("./services/booking.service");
var booking_schema_1 = require("./schemas/booking.schema");
var jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env',
                }),
                jwt_1.JwtModule.registerAsync({
                    imports: [config_1.ConfigModule],
                    useFactory: function (configService) { return ({
                        secret: configService.get('JWT_SECRET', 'super-secret-key'),
                        signOptions: { expiresIn: '1h' },
                    }); },
                    inject: [config_1.ConfigService],
                }),
                // MongoDB connection
                mongoose_1.MongooseModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    useFactory: function (configService) { return ({
                        uri: configService.get('MONGODB_URI', 'mongodb://admin:password123@localhost:27017'),
                        dbName: configService.get('MONGODB_DB_NAME', 'booking'),
                    }); },
                    inject: [config_1.ConfigService],
                }),
                mongoose_1.MongooseModule.forFeature([{ name: booking_schema_1.Booking.name, schema: booking_schema_1.BookingSchema }]),
                axios_1.HttpModule.registerAsync({
                    imports: [config_1.ConfigModule],
                    useFactory: function (configService) { return ({
                        timeout: 5000,
                        maxRedirects: 5,
                    }); },
                    inject: [config_1.ConfigService],
                }),
                shared_1.RabbitMQModule.forRoot({
                    urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
                }),
                shared_1.RedisModule.forRoot(),
            ],
            controllers: [booking_controller_1.BookingController, internal_controller_1.InternalController],
            providers: [
                booking_service_1.BookingService,
                jwt_auth_guard_1.JwtAuthGuard,
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
