"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertActionLink = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const Button_1 = require("../Button");
const AlertActionLink = (_a) => {
    var { className = '', children } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.link, isInline: true, className: className }, props, { children: children })));
};
exports.AlertActionLink = AlertActionLink;
exports.AlertActionLink.displayName = 'AlertActionLink';
//# sourceMappingURL=AlertActionLink.js.map