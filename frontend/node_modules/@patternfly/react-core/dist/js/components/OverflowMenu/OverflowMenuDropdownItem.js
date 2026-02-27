"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowMenuDropdownItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const Dropdown_1 = require("../Dropdown");
const OverflowMenuContext_1 = require("./OverflowMenuContext");
const OverflowMenuDropdownItem = (_a) => {
    var { children, isShared = false, itemId } = _a, additionalProps = tslib_1.__rest(_a, ["children", "isShared", "itemId"]);
    return ((0, jsx_runtime_1.jsx)(OverflowMenuContext_1.OverflowMenuContext.Consumer, { children: (value) => (!isShared || value.isBelowBreakpoint) && ((0, jsx_runtime_1.jsx)(Dropdown_1.DropdownItem, Object.assign({ component: "button", value: itemId }, additionalProps, { children: children }))) }));
};
exports.OverflowMenuDropdownItem = OverflowMenuDropdownItem;
exports.OverflowMenuDropdownItem.displayName = 'OverflowMenuDropdownItem';
//# sourceMappingURL=OverflowMenuDropdownItem.js.map