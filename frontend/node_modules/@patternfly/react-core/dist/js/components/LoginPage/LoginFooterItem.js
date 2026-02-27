"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginFooterItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const LoginFooterItem = (_a) => {
    var { children = null, href = '#', target = '_blank' } = _a, props = tslib_1.__rest(_a, ["children", "href", "target"]);
    return (0, react_1.isValidElement)(children) ? (children) : ((0, jsx_runtime_1.jsx)("a", Object.assign({ target: target, href: href }, props, { children: children })));
};
exports.LoginFooterItem = LoginFooterItem;
exports.LoginFooterItem.displayName = 'LoginFooterItem';
//# sourceMappingURL=LoginFooterItem.js.map