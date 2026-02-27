"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const stack_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/layouts/Stack/stack"));
const react_styles_1 = require("@patternfly/react-styles");
const StackItem = (_a) => {
    var { isFilled = false, className = '', children = null, component = 'div' } = _a, props = tslib_1.__rest(_a, ["isFilled", "className", "children", "component"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({}, props, { className: (0, react_styles_1.css)(stack_1.default.stackItem, isFilled && stack_1.default.modifiers.fill, className), children: children })));
};
exports.StackItem = StackItem;
exports.StackItem.displayName = 'StackItem';
//# sourceMappingURL=StackItem.js.map