"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavItemSeparator = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const Divider_1 = require("../Divider");
const NavItemSeparator = (_a) => {
    var { component = 'li', role = 'presentation' } = _a, props = tslib_1.__rest(_a, ["component", "role"]);
    return (0, jsx_runtime_1.jsx)(Divider_1.Divider, Object.assign({ component: component, role: role }, props));
};
exports.NavItemSeparator = NavItemSeparator;
exports.NavItemSeparator.displayName = 'NavItemSeparator';
//# sourceMappingURL=NavItemSeparator.js.map