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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
var rrweb_snapshot_1 = require("rrweb-snapshot");
var mittProxy = require("mitt");
var smoothscroll = require("smoothscroll-polyfill");
var timer_1 = require("./timer");
var types_1 = require("../types");
var utils_1 = require("../utils");
var inject_style_1 = require("./styles/inject-style");
require("./styles/style.css");
var SKIP_TIME_THRESHOLD = 10 * 1000;
var SKIP_TIME_INTERVAL = 5 * 1000;
var mitt = mittProxy["default"] || mittProxy;
var REPLAY_CONSOLE_PREFIX = '[replayer]';
var Replayer = (function () {
    function Replayer(events, config) {
        this.events = [];
        this.emitter = mitt();
        this.baselineTime = 0;
        this.noramlSpeed = -1;
        this.missingNodeRetryMap = {};
        if (events.length < 2) {
            throw new Error('Replayer need at least 2 events.');
        }
        this.events = events;
        this.handleResize = this.handleResize.bind(this);
        var defaultConfig = {
            speed: 1,
            root: document.body,
            loadTimeout: 0,
            skipInactive: false,
            showWarning: true,
            showDebug: false,
            blockClass: 'rr-block',
            liveMode: false,
            insertStyleRules: []
        };
        this.config = Object.assign({}, defaultConfig, config);
        this.timer = new timer_1["default"](this.config);
        smoothscroll.polyfill();
        utils_1.polyfill();
        this.setupDom();
        this.emitter.on('resize', this.handleResize);
    }
    Replayer.prototype.on = function (event, handler) {
        this.emitter.on(event, handler);
    };
    Replayer.prototype.setConfig = function (config) {
        var _this = this;
        Object.keys(config).forEach(function (key) {
            _this.config[key] = config[key];
        });
        if (!this.config.skipInactive) {
            this.noramlSpeed = -1;
        }
    };
    Replayer.prototype.getMetaData = function () {
        var firstEvent = this.events[0];
        var lastEvent = this.events[this.events.length - 1];
        return {
            totalTime: lastEvent.timestamp - firstEvent.timestamp
        };
    };
    Replayer.prototype.getCurrentTime = function () {
        return this.timer.timeOffset + this.getTimeOffset();
    };
    Replayer.prototype.getTimeOffset = function () {
        return this.baselineTime - this.events[0].timestamp;
    };
    Replayer.prototype.play = function (timeOffset) {
        var e_1, _a;
        var _this = this;
        if (timeOffset === void 0) { timeOffset = 0; }
        this.timer.clear();
        this.baselineTime = this.events[0].timestamp + timeOffset;
        var actions = new Array();
        var _loop_1 = function (event_1) {
            var isSync = event_1.timestamp < this_1.baselineTime;
            var castFn = this_1.getCastFn(event_1, isSync);
            if (isSync) {
                castFn();
            }
            else {
                actions.push({
                    doAction: function () {
                        castFn();
                        _this.emitter.emit(types_1.ReplayerEvents.EventCast, event_1);
                    },
                    delay: this_1.getDelay(event_1)
                });
            }
        };
        var this_1 = this;
        try {
            for (var _b = __values(this.events), _c = _b.next(); !_c.done; _c = _b.next()) {
                var event_1 = _c.value;
                _loop_1(event_1);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.timer.addActions(actions);
        this.timer.start();
        this.emitter.emit(types_1.ReplayerEvents.Start);
    };
    Replayer.prototype.pause = function () {
        this.timer.clear();
        this.emitter.emit(types_1.ReplayerEvents.Pause);
    };
    Replayer.prototype.resume = function (timeOffset) {
        var e_2, _a;
        if (timeOffset === void 0) { timeOffset = 0; }
        this.timer.clear();
        this.baselineTime = this.events[0].timestamp + timeOffset;
        var actions = new Array();
        try {
            for (var _b = __values(this.events), _c = _b.next(); !_c.done; _c = _b.next()) {
                var event_2 = _c.value;
                if (event_2.timestamp <= this.lastPlayedEvent.timestamp ||
                    event_2 === this.lastPlayedEvent) {
                    continue;
                }
                var castFn = this.getCastFn(event_2);
                actions.push({
                    doAction: castFn,
                    delay: this.getDelay(event_2)
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.timer.addActions(actions);
        this.timer.start();
        this.emitter.emit(types_1.ReplayerEvents.Resume);
    };
    Replayer.prototype.addEvent = function (event) {
        var castFn = this.getCastFn(event, true);
        castFn();
    };
    Replayer.prototype.setupDom = function () {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('replayer-wrapper');
        this.config.root.appendChild(this.wrapper);
        this.mouse = document.createElement('div');
        this.mouse.classList.add('replayer-mouse');
        this.wrapper.appendChild(this.mouse);
        this.iframe = document.createElement('iframe');
        this.iframe.setAttribute('sandbox', 'allow-same-origin');
        this.iframe.setAttribute('scrolling', 'no');
        this.iframe.setAttribute('style', 'pointer-events: none');
        this.wrapper.appendChild(this.iframe);
    };
    Replayer.prototype.handleResize = function (dimension) {
        this.iframe.width = dimension.width + "px";
        this.iframe.height = dimension.height + "px";
    };
    Replayer.prototype.getDelay = function (event) {
        if (event.type === types_1.EventType.IncrementalSnapshot &&
            event.data.source === types_1.IncrementalSource.MouseMove) {
            var firstOffset = event.data.positions[0].timeOffset;
            var firstTimestamp = event.timestamp + firstOffset;
            event.delay = firstTimestamp - this.baselineTime;
            return firstTimestamp - this.baselineTime;
        }
        event.delay = event.timestamp - this.baselineTime;
        return event.timestamp - this.baselineTime;
    };
    Replayer.prototype.getCastFn = function (event, isSync) {
        var _this = this;
        if (isSync === void 0) { isSync = false; }
        var castFn;
        switch (event.type) {
            case types_1.EventType.DomContentLoaded:
            case types_1.EventType.Load:
                break;
            case types_1.EventType.Meta:
                castFn = function () {
                    return _this.emitter.emit(types_1.ReplayerEvents.Resize, {
                        width: event.data.width,
                        height: event.data.height
                    });
                };
                break;
            case types_1.EventType.FullSnapshot:
                castFn = function () {
                    _this.rebuildFullSnapshot(event);
                    _this.iframe.contentWindow.scrollTo(event.data.initialOffset);
                };
                break;
            case types_1.EventType.IncrementalSnapshot:
                castFn = function () {
                    var e_3, _a;
                    _this.applyIncremental(event, isSync);
                    if (event === _this.nextUserInteractionEvent) {
                        _this.nextUserInteractionEvent = null;
                        _this.restoreSpeed();
                    }
                    if (_this.config.skipInactive && !_this.nextUserInteractionEvent) {
                        try {
                            for (var _b = __values(_this.events), _c = _b.next(); !_c.done; _c = _b.next()) {
                                var _event = _c.value;
                                if (_event.timestamp <= event.timestamp) {
                                    continue;
                                }
                                if (_this.isUserInteraction(_event)) {
                                    if (_event.delay - event.delay >
                                        SKIP_TIME_THRESHOLD * _this.config.speed) {
                                        _this.nextUserInteractionEvent = _event;
                                    }
                                    break;
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        if (_this.nextUserInteractionEvent) {
                            _this.noramlSpeed = _this.config.speed;
                            var skipTime = _this.nextUserInteractionEvent.delay - event.delay;
                            var payload = {
                                speed: Math.min(Math.round(skipTime / SKIP_TIME_INTERVAL), 360)
                            };
                            _this.setConfig(payload);
                            _this.emitter.emit(types_1.ReplayerEvents.SkipStart, payload);
                        }
                    }
                };
                break;
            default:
        }
        var wrappedCastFn = function () {
            if (castFn) {
                castFn();
            }
            _this.lastPlayedEvent = event;
            if (event === _this.events[_this.events.length - 1]) {
                _this.restoreSpeed();
                _this.emitter.emit(types_1.ReplayerEvents.Finish);
            }
        };
        return wrappedCastFn;
    };
    Replayer.prototype.rebuildFullSnapshot = function (event) {
        if (Object.keys(this.missingNodeRetryMap).length) {
            console.warn('Found unresolved missing node map', this.missingNodeRetryMap);
        }
        this.missingNodeRetryMap = {};
        utils_1.mirror.map = rrweb_snapshot_1.rebuild(event.data.node, this.iframe.contentDocument)[1];
        var styleEl = document.createElement('style');
        var _a = this.iframe.contentDocument, documentElement = _a.documentElement, head = _a.head;
        documentElement.insertBefore(styleEl, head);
        var injectStylesRules = inject_style_1["default"](this.config.blockClass).concat(this.config.insertStyleRules);
        for (var idx = 0; idx < injectStylesRules.length; idx++) {
            styleEl.sheet.insertRule(injectStylesRules[idx], idx);
        }
        this.emitter.emit(types_1.ReplayerEvents.FullsnapshotRebuilded);
        this.waitForStylesheetLoad();
    };
    Replayer.prototype.waitForStylesheetLoad = function () {
        var _this = this;
        var head = this.iframe.contentDocument.head;
        if (head) {
            var unloadSheets_1 = new Set();
            var timer_2;
            head
                .querySelectorAll('link[rel="stylesheet"]')
                .forEach(function (css) {
                if (!css.sheet) {
                    if (unloadSheets_1.size === 0) {
                        _this.pause();
                        _this.emitter.emit(types_1.ReplayerEvents.LoadStylesheetStart);
                        timer_2 = window.setTimeout(function () {
                            _this.resume(_this.getCurrentTime());
                            timer_2 = -1;
                        }, _this.config.loadTimeout);
                    }
                    unloadSheets_1.add(css);
                    css.addEventListener('load', function () {
                        unloadSheets_1["delete"](css);
                        if (unloadSheets_1.size === 0 && timer_2 !== -1) {
                            _this.resume(_this.getCurrentTime());
                            _this.emitter.emit(types_1.ReplayerEvents.LoadStylesheetEnd);
                            if (timer_2) {
                                window.clearTimeout(timer_2);
                            }
                        }
                    });
                }
            });
        }
    };
    Replayer.prototype.applyIncremental = function (e, isSync) {
        var _this = this;
        var d = e.data;
        switch (d.source) {
            case types_1.IncrementalSource.Mutation: {
                d.removes.forEach(function (mutation) {
                    var target = utils_1.mirror.getNode(mutation.id);
                    if (!target) {
                        return _this.warnNodeNotFound(d, mutation.id);
                    }
                    var parent = utils_1.mirror.getNode(mutation.parentId);
                    if (!parent) {
                        return _this.warnNodeNotFound(d, mutation.parentId);
                    }
                    utils_1.mirror.removeNodeFromMap(target);
                    if (parent) {
                        parent.removeChild(target);
                    }
                });
                var missingNodeMap_1 = __assign({}, this.missingNodeRetryMap);
                var queue_1 = [];
                var appendNode_1 = function (mutation) {
                    var parent = utils_1.mirror.getNode(mutation.parentId);
                    if (!parent) {
                        return queue_1.push(mutation);
                    }
                    var target = rrweb_snapshot_1.buildNodeWithSN(mutation.node, _this.iframe.contentDocument, utils_1.mirror.map, true);
                    var previous = null;
                    var next = null;
                    if (mutation.previousId) {
                        previous = utils_1.mirror.getNode(mutation.previousId);
                    }
                    if (mutation.nextId) {
                        next = utils_1.mirror.getNode(mutation.nextId);
                    }
                    if (mutation.previousId === -1 || mutation.nextId === -1) {
                        missingNodeMap_1[mutation.node.id] = {
                            node: target,
                            mutation: mutation
                        };
                        return;
                    }
                    if (previous &&
                        previous.nextSibling &&
                        previous.nextSibling.parentNode) {
                        parent.insertBefore(target, previous.nextSibling);
                    }
                    else if (next && next.parentNode) {
                        parent.insertBefore(target, next);
                    }
                    else {
                        parent.appendChild(target);
                    }
                    if (mutation.previousId || mutation.nextId) {
                        _this.resolveMissingNode(missingNodeMap_1, parent, target, mutation);
                    }
                };
                d.adds.forEach(function (mutation) {
                    appendNode_1(mutation);
                });
                while (queue_1.length) {
                    if (queue_1.every(function (m) { return !Boolean(utils_1.mirror.getNode(m.parentId)); })) {
                        return queue_1.forEach(function (m) { return _this.warnNodeNotFound(d, m.node.id); });
                    }
                    var mutation = queue_1.shift();
                    appendNode_1(mutation);
                }
                if (Object.keys(missingNodeMap_1).length) {
                    Object.assign(this.missingNodeRetryMap, missingNodeMap_1);
                }
                d.texts.forEach(function (mutation) {
                    var target = utils_1.mirror.getNode(mutation.id);
                    if (!target) {
                        return _this.warnNodeNotFound(d, mutation.id);
                    }
                    target.textContent = mutation.value;
                });
                d.attributes.forEach(function (mutation) {
                    var target = utils_1.mirror.getNode(mutation.id);
                    if (!target) {
                        return _this.warnNodeNotFound(d, mutation.id);
                    }
                    for (var attributeName in mutation.attributes) {
                        if (typeof attributeName === 'string') {
                            var value = mutation.attributes[attributeName];
                            if (value !== null) {
                                target.setAttribute(attributeName, value);
                            }
                            else {
                                target.removeAttribute(attributeName);
                            }
                        }
                    }
                });
                break;
            }
            case types_1.IncrementalSource.MouseMove:
                if (isSync) {
                    var lastPosition = d.positions[d.positions.length - 1];
                    this.moveAndHover(d, lastPosition.x, lastPosition.y, lastPosition.id);
                }
                else {
                    d.positions.forEach(function (p) {
                        var action = {
                            doAction: function () {
                                _this.moveAndHover(d, p.x, p.y, p.id);
                            },
                            delay: p.timeOffset + e.timestamp - _this.baselineTime
                        };
                        _this.timer.addAction(action);
                    });
                }
                break;
            case types_1.IncrementalSource.MouseInteraction: {
                if (d.id === -1) {
                    break;
                }
                var event_3 = new Event(types_1.MouseInteractions[d.type].toLowerCase());
                var target = utils_1.mirror.getNode(d.id);
                if (!target) {
                    return this.debugNodeNotFound(d, d.id);
                }
                this.emitter.emit(types_1.ReplayerEvents.MouseInteraction, {
                    type: d.type,
                    target: target
                });
                switch (d.type) {
                    case types_1.MouseInteractions.Blur:
                        if (target.blur) {
                            target.blur();
                        }
                        break;
                    case types_1.MouseInteractions.Focus:
                        if (target.focus) {
                            target.focus({
                                preventScroll: true
                            });
                        }
                        break;
                    case types_1.MouseInteractions.Click:
                    case types_1.MouseInteractions.TouchStart:
                    case types_1.MouseInteractions.TouchEnd:
                        if (!isSync) {
                            this.moveAndHover(d, d.x, d.y, d.id);
                            this.mouse.classList.remove('active');
                            void this.mouse.offsetWidth;
                            this.mouse.classList.add('active');
                        }
                        break;
                    default:
                        target.dispatchEvent(event_3);
                }
                break;
            }
            case types_1.IncrementalSource.Scroll: {
                if (d.id === -1) {
                    break;
                }
                var target = utils_1.mirror.getNode(d.id);
                if (!target) {
                    return this.debugNodeNotFound(d, d.id);
                }
                if (target === this.iframe.contentDocument) {
                    this.iframe.contentWindow.scrollTo({
                        top: d.y,
                        left: d.x,
                        behavior: isSync ? 'auto' : 'smooth'
                    });
                }
                else {
                    try {
                        target.scrollTop = d.y;
                        target.scrollLeft = d.x;
                    }
                    catch (error) {
                    }
                }
                break;
            }
            case types_1.IncrementalSource.ViewportResize:
                this.emitter.emit(types_1.ReplayerEvents.Resize, {
                    width: d.width,
                    height: d.height
                });
                break;
            case types_1.IncrementalSource.Input: {
                if (d.id === -1) {
                    break;
                }
                var target = utils_1.mirror.getNode(d.id);
                if (!target) {
                    return this.debugNodeNotFound(d, d.id);
                }
                try {
                    target.checked = d.isChecked;
                    target.value = d.text;
                }
                catch (error) {
                }
                break;
            }
            case types_1.IncrementalSource.MediaInteraction: {
                var target = utils_1.mirror.getNode(d.id);
                if (!target) {
                    return this.debugNodeNotFound(d, d.id);
                }
                var mediaEl_1 = target;
                if (d.type === 1) {
                    mediaEl_1.pause();
                }
                if (d.type === 0) {
                    if (mediaEl_1.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                        mediaEl_1.play();
                    }
                    else {
                        mediaEl_1.addEventListener('canplay', function () {
                            mediaEl_1.play();
                        });
                    }
                }
                break;
            }
            case types_1.IncrementalSource.StyleSheetInteraction: {
                var head = this.iframe.contentDocument.head;
                var stylesEls = head.getElementsByTagName('style');
                var styleSheet = stylesEls[stylesEls.length - 1].sheet;
                if (styleSheet) {
                    styleSheet.insertRule(d.rule, d.index);
                }
                break;
            }
            default:
        }
    };
    Replayer.prototype.resolveMissingNode = function (map, parent, target, targetMutation) {
        var previousId = targetMutation.previousId, nextId = targetMutation.nextId;
        var previousInMap = previousId && map[previousId];
        var nextInMap = nextId && map[nextId];
        if (previousInMap) {
            var _a = previousInMap, node = _a.node, mutation = _a.mutation;
            parent.insertBefore(node, target);
            delete map[mutation.node.id];
            delete this.missingNodeRetryMap[mutation.node.id];
            if (mutation.previousId || mutation.nextId) {
                this.resolveMissingNode(map, parent, node, mutation);
            }
        }
        if (nextInMap) {
            var _b = nextInMap, node = _b.node, mutation = _b.mutation;
            parent.insertBefore(node, target.nextSibling);
            delete map[mutation.node.id];
            delete this.missingNodeRetryMap[mutation.node.id];
            if (mutation.previousId || mutation.nextId) {
                this.resolveMissingNode(map, parent, node, mutation);
            }
        }
    };
    Replayer.prototype.moveAndHover = function (d, x, y, id) {
        this.mouse.style.left = x + "px";
        this.mouse.style.top = y + "px";
        var target = utils_1.mirror.getNode(id);
        if (!target) {
            return this.debugNodeNotFound(d, id);
        }
        this.hoverElements(target);
    };
    Replayer.prototype.hoverElements = function (el) {
        this.iframe
            .contentDocument.querySelectorAll('.\\:hover')
            .forEach(function (hoveredEl) {
            hoveredEl.classList.remove(':hover');
        });
        var currentEl = el;
        while (currentEl) {
            currentEl.classList.add(':hover');
            currentEl = currentEl.parentElement;
        }
    };
    Replayer.prototype.isUserInteraction = function (event) {
        if (event.type !== types_1.EventType.IncrementalSnapshot) {
            return false;
        }
        return (event.data.source > types_1.IncrementalSource.Mutation &&
            event.data.source <= types_1.IncrementalSource.Input);
    };
    Replayer.prototype.restoreSpeed = function () {
        if (this.noramlSpeed === -1) {
            return;
        }
        var payload = { speed: this.noramlSpeed };
        this.setConfig(payload);
        this.emitter.emit(types_1.ReplayerEvents.SkipEnd, payload);
        this.noramlSpeed = -1;
    };
    Replayer.prototype.warnNodeNotFound = function (d, id) {
        if (!this.config.showWarning) {
            return;
        }
        console.warn(REPLAY_CONSOLE_PREFIX, "Node with id '" + id + "' not found in", d);
    };
    Replayer.prototype.debugNodeNotFound = function (d, id) {
        if (!this.config.showDebug) {
            return;
        }
        console.log(REPLAY_CONSOLE_PREFIX, "Node with id '" + id + "' not found in", d);
    };
    return Replayer;
}());
exports.Replayer = Replayer;
//# sourceMappingURL=index.js.map