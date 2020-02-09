"use strict";
exports.__esModule = true;
var utils_1 = require("../utils");
function deepDelete(addsSet, n) {
    addsSet["delete"](n);
    n.childNodes.forEach(function (childN) { return deepDelete(addsSet, childN); });
}
exports.deepDelete = deepDelete;
function isParentRemoved(removes, n) {
    var parentNode = n.parentNode;
    if (!parentNode) {
        return false;
    }
    var parentId = utils_1.mirror.getId(parentNode);
    if (removes.some(function (r) { return r.id === parentId; })) {
        return true;
    }
    return isParentRemoved(removes, parentNode);
}
exports.isParentRemoved = isParentRemoved;
function isAncestorInSet(set, n) {
    var parentNode = n.parentNode;
    if (!parentNode) {
        return false;
    }
    if (set.has(parentNode)) {
        return true;
    }
    return isAncestorInSet(set, parentNode);
}
exports.isAncestorInSet = isAncestorInSet;
//# sourceMappingURL=collection.js.map