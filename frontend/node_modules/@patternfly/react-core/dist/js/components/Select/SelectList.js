"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const Menu_1 = require("../Menu");
const SelectList = (_a) => {
    var { children, className, isAriaMultiselectable = false } = _a, props = tslib_1.__rest(_a, ["children", "className", "isAriaMultiselectable"]);
    return ((0, jsx_runtime_1.jsx)(Menu_1.MenuList, Object.assign({ isAriaMultiselectable: isAriaMultiselectable, className: (0, react_styles_1.css)(className) }, props, { children: children })));
};
exports.SelectList = SelectList;
exports.SelectList.displayName = 'SelectList';
//# sourceMappingURL=SelectList.js.map