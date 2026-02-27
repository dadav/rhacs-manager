"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const Menu_1 = require("../Menu");
const SelectGroup = (_a) => {
    var { children, className, label } = _a, props = tslib_1.__rest(_a, ["children", "className", "label"]);
    return ((0, jsx_runtime_1.jsx)(Menu_1.MenuGroup, Object.assign({ className: (0, react_styles_1.css)(className), label: label }, props, { children: children })));
};
exports.SelectGroup = SelectGroup;
exports.SelectGroup.displayName = 'SelectGroup';
//# sourceMappingURL=SelectGroup.js.map