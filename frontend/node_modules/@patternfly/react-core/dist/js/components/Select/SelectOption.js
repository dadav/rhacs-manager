"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectOption = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const Menu_1 = require("../Menu");
const SelectOptionBase = (_a) => {
    var { children, className, innerRef, value } = _a, props = tslib_1.__rest(_a, ["children", "className", "innerRef", "value"]);
    return ((0, jsx_runtime_1.jsx)(Menu_1.MenuItem, Object.assign({ itemId: value, ref: innerRef, className: (0, react_styles_1.css)(className) }, props, { children: children })));
};
exports.SelectOption = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(SelectOptionBase, Object.assign({}, props, { innerRef: ref }))));
exports.SelectOption.displayName = 'SelectOption';
//# sourceMappingURL=SelectOption.js.map