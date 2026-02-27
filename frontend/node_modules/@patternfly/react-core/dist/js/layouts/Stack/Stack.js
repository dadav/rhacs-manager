"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stack = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const stack_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/layouts/Stack/stack"));
const react_styles_1 = require("@patternfly/react-styles");
const Stack = (_a) => {
    var { hasGutter = false, className = '', children = null, component = 'div' } = _a, props = tslib_1.__rest(_a, ["hasGutter", "className", "children", "component"]);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({}, props, { className: (0, react_styles_1.css)(stack_1.default.stack, hasGutter && stack_1.default.modifiers.gutter, className), children: children })));
};
exports.Stack = Stack;
exports.Stack.displayName = 'Stack';
//# sourceMappingURL=Stack.js.map