"use strict";
exports.__esModule = true;
var record_1 = require("./record");
exports.record = record_1["default"];
var replay_1 = require("./replay");
exports.Replayer = replay_1.Replayer;
var utils_1 = require("./utils");
exports.mirror = utils_1.mirror;
var types_1 = require("./types");
exports.EventType = types_1.EventType;
exports.IncrementalSource = types_1.IncrementalSource;
exports.MouseInteractions = types_1.MouseInteractions;
exports.ReplayerEvents = types_1.ReplayerEvents;
var addCustomEvent = record_1["default"].addCustomEvent;
exports.addCustomEvent = addCustomEvent;
//# sourceMappingURL=index.js.map