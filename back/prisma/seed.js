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
var client_1 = require("../generated/client");
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var bcrypt = require("bcrypt");
var connectionString = process.env.DATABASE_URL;
var pool = new pg_1.Pool({ connectionString: connectionString });
var adapter = new adapter_pg_1.PrismaPg(pool);
var prisma = new client_1.PrismaClient({ adapter: adapter });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminEmail, hashedPassword, _i, _a, attributeType, attribute, _b, _c, statType, stat, channelsNames, _d, channelsNames_1, channelName, channel, usersData, _e, usersData_1, u, user, itemsData, _f, itemsData_1, itemData, item;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    adminEmail = 'admin@gmail.com';
                    return [4 /*yield*/, bcrypt.hash('Qwerty123!', 10)];
                case 1:
                    hashedPassword = _g.sent();
                    _i = 0, _a = Object.values(client_1.AttributeType);
                    _g.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    attributeType = _a[_i];
                    return [4 /*yield*/, prisma.attribute.upsert({
                            where: { name: attributeType },
                            update: {},
                            create: {
                                name: attributeType,
                            },
                        })];
                case 3:
                    attribute = _g.sent();
                    console.log("\u0421\u043E\u0437\u0434\u0430\u043D \u0430\u0442\u0440\u0438\u0431\u0443\u0442: ".concat(attribute.name));
                    _g.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    _b = 0, _c = Object.values(client_1.StatType);
                    _g.label = 6;
                case 6:
                    if (!(_b < _c.length)) return [3 /*break*/, 9];
                    statType = _c[_b];
                    return [4 /*yield*/, prisma.stat.upsert({
                            where: { name: statType },
                            update: {},
                            create: {
                                name: statType,
                            },
                        })];
                case 7:
                    stat = _g.sent();
                    console.log("\u0421\u043E\u0437\u0434\u0430\u043D \u0441\u0442\u0430\u0442: ".concat(stat.name));
                    _g.label = 8;
                case 8:
                    _b++;
                    return [3 /*break*/, 6];
                case 9:
                    channelsNames = ['General', 'Market'];
                    _d = 0, channelsNames_1 = channelsNames;
                    _g.label = 10;
                case 10:
                    if (!(_d < channelsNames_1.length)) return [3 /*break*/, 13];
                    channelName = channelsNames_1[_d];
                    return [4 /*yield*/, prisma.channel.upsert({
                            where: { name: channelName },
                            update: {},
                            create: { name: channelName },
                        })];
                case 11:
                    channel = _g.sent();
                    console.log("\u0421\u043E\u0437\u0434\u0430\u043D \u043A\u0430\u043D\u0430\u043B: ".concat(channel.name));
                    _g.label = 12;
                case 12:
                    _d++;
                    return [3 /*break*/, 10];
                case 13:
                    usersData = [
                        {
                            email: adminEmail,
                            password: hashedPassword,
                            name: 'Admin_God',
                            gender: client_1.Gender.MALE,
                            country: 'Russia',
                            city: 'Moscow',
                            gameProfile: {
                                create: {
                                    gold: 99999,
                                    experience: 150000,
                                    level: 100,
                                },
                            },
                        },
                        {
                            email: 'alice@example.com',
                            password: hashedPassword,
                            name: 'Alice_Hero',
                            gender: client_1.Gender.FEMALE,
                            language: 'en',
                            gameProfile: {
                                create: {
                                    gold: 1500,
                                    experience: 2500,
                                    level: 10,
                                },
                            },
                        },
                        {
                            email: 'newbie@example.com',
                            password: hashedPassword,
                            name: 'NoobMaster',
                            gameProfile: {
                                create: {},
                            },
                        },
                    ];
                    _e = 0, usersData_1 = usersData;
                    _g.label = 14;
                case 14:
                    if (!(_e < usersData_1.length)) return [3 /*break*/, 17];
                    u = usersData_1[_e];
                    return [4 /*yield*/, prisma.user.create({ data: u })];
                case 15:
                    user = _g.sent();
                    console.log("\u0421\u043E\u0437\u0434\u0430\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ".concat(user.name));
                    _g.label = 16;
                case 16:
                    _e++;
                    return [3 /*break*/, 14];
                case 17:
                    itemsData = [
                        {
                            name: 'Wooden Sword',
                            description: 'Простой деревянный меч для тренировок.',
                            price: 10,
                            icon: 'icon_wooden_sword.png',
                            rarity: client_1.ItemRarity.COMMON,
                            equipmentType: [client_1.EquipmentType.WEAPON],
                            attributes: {
                                create: [{ stat: { connect: { name: client_1.StatType.DAMAGE } }, value: 1 }],
                            },
                        },
                        {
                            name: 'Iron Shield',
                            description: 'Тяжелый, но надежный железный щит.',
                            price: 50,
                            icon: 'icon_iron_shield.png',
                            rarity: client_1.ItemRarity.COMMON,
                            equipmentType: [client_1.EquipmentType.SHIELD],
                            attributes: {
                                create: [{ stat: { connect: { name: client_1.StatType.DEFENSE } }, value: 1 }],
                            },
                        },
                        {
                            name: 'Minor Health Potion',
                            description: 'Восстанавливает немного здоровья.',
                            price: 15,
                            icon: 'icon_hp_potion.png',
                            rarity: client_1.ItemRarity.COMMON,
                            equipmentType: [client_1.EquipmentType.POTION],
                            consumable: true,
                            // TODO: нужно добавить эффекты
                        },
                        {
                            name: 'Leather Armor',
                            description: 'Легкая броня из выделанной кожи.',
                            price: 120,
                            icon: 'icon_leather_armor.png',
                            rarity: client_1.ItemRarity.MAGIC,
                            equipmentType: [client_1.EquipmentType.BODY],
                            attributes: {
                                create: [
                                    { stat: { connect: { name: client_1.StatType.DEFENSE } }, value: 5 },
                                    { stat: { connect: { name: client_1.StatType.DODGE } }, value: 3 },
                                ],
                            },
                        },
                        {
                            name: 'Ring of Vitality',
                            description: 'Кольцо, пульсирующее жизненной энергией.',
                            price: 500,
                            icon: 'icon_vitality_ring.png',
                            rarity: client_1.ItemRarity.RARE,
                            equipmentType: [client_1.EquipmentType.RING],
                            attributes: {
                                create: [
                                    { stat: { connect: { name: client_1.StatType.MANA } }, value: 5 },
                                    { stat: { connect: { name: client_1.StatType.HEALTH } }, value: 10 },
                                    { stat: { connect: { name: client_1.StatType.DEFENSE } }, value: 3 },
                                ],
                            },
                        },
                        {
                            name: 'Excalibur',
                            description: 'Легендарный меч истинного короля.',
                            price: 10000,
                            icon: 'icon_excalibur.png',
                            rarity: client_1.ItemRarity.UNIQUE,
                            equipmentType: [client_1.EquipmentType.WEAPON],
                            attributes: {
                                create: [
                                    { stat: { connect: { name: client_1.StatType.DAMAGE } }, value: 50 },
                                    { stat: { connect: { name: client_1.StatType.CRIT_DAMAGE } }, value: 15 },
                                    { stat: { connect: { name: client_1.StatType.CRIT } }, value: 10 },
                                ],
                            },
                        },
                        {
                            name: 'Boots of Swiftness',
                            description: 'Позволяют владельцу бегать со скоростью ветра.',
                            price: 800,
                            icon: 'icon_swift_boots.png',
                            rarity: client_1.ItemRarity.RARE,
                            equipmentType: [client_1.EquipmentType.BOOTS],
                            attributes: {
                                create: [{ attribute: { connect: { name: client_1.AttributeType.AGILITY } }, value: 10 }],
                            },
                        },
                        {
                            name: 'Amulet of the Archmage',
                            description: 'Дарует невероятную магическую силу.',
                            price: 15000,
                            icon: 'icon_archmage_amulet.png',
                            rarity: client_1.ItemRarity.UNIQUE,
                            equipmentType: [client_1.EquipmentType.AMULET],
                            attributes: {
                                create: [
                                    { attribute: { connect: { name: client_1.AttributeType.WISDOM } }, value: 10 },
                                    { stat: { connect: { name: client_1.StatType.MANA } }, value: 15 },
                                ],
                            },
                        },
                        {
                            name: 'Town Portal Scroll',
                            description: 'Свиток, открывающий портал в ближайший город.',
                            price: 100,
                            icon: 'icon_tp_scroll.png',
                            rarity: client_1.ItemRarity.QUEST,
                            equipmentType: [client_1.EquipmentType.SCROLL],
                            consumable: true,
                            // добавить эффект
                        },
                        {
                            name: 'Dragon Scale Helmet',
                            description: 'Шлем, выкованный из чешуи древнего дракона.',
                            price: 3500,
                            icon: 'icon_dragon_helm.png',
                            rarity: client_1.ItemRarity.RARE,
                            equipmentType: [client_1.EquipmentType.HELMET],
                            attributes: {
                                create: [
                                    { stat: { connect: { name: client_1.StatType.DEFENSE } }, value: 50 },
                                    { stat: { connect: { name: client_1.StatType.DODGE } }, value: 15 },
                                ],
                            },
                        },
                    ];
                    _f = 0, itemsData_1 = itemsData;
                    _g.label = 18;
                case 18:
                    if (!(_f < itemsData_1.length)) return [3 /*break*/, 21];
                    itemData = itemsData_1[_f];
                    return [4 /*yield*/, prisma.item.create({ data: itemData })];
                case 19:
                    item = _g.sent();
                    console.log("\u0421\u043E\u0437\u0434\u0430\u043D \u043F\u0440\u0435\u0434\u043C\u0435\u0442: ".concat(item.name, " (").concat(item.rarity, ")"));
                    _g.label = 20;
                case 20:
                    _f++;
                    return [3 /*break*/, 18];
                case 21:
                    console.log('Сиды успешно выполнены');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
