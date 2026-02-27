"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Split = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const split_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/layouts/Split/split"));
const react_styles_1 = require("@patternfly/react-styles");
const Split = (_a) => {
    var { hasGutter = false, isWrappable = false, className = '', children = null, component = 'div' } = _a, props = tslib_1.__rest(_a, ["hasGutter", "isWrappable", "className", "children", "component"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({}, props, { className: (0, react_styles_1.css)(split_1.default.split, hasGutter && split_1.default.modifiers.gutter, isWrappable && split_1.default.modifiers.wrap, className), children: children })));
};
exports.Split = Split;
exports.Split.displayName = 'Split';
//# sourceMappingURL=Split.js.map