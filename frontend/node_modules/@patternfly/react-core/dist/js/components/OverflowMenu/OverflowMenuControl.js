"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowMenuControl = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const overflow_menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/OverflowMenu/overflow-menu"));
const OverflowMenuContext_1 = require("./OverflowMenuContext");
const OverflowMenuControl = (_a) => {
    var { className, children, hasAdditionalOptions } = _a, props = tslib_1.__rest(_a, ["className", "children", "hasAdditionalOptions"]);
    return ((0, jsx_runtime_1.jsx)(OverflowMenuContext_1.OverflowMenuContext.Consumer, { children: (value) => (value.isBelowBreakpoint || hasAdditionalOptions) && ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(overflow_menu_1.default.overflowMenuControl, className) }, props, { children: [' ', children, ' '] }))) }));
};
exports.OverflowMenuControl = OverflowMenuControl;
exports.OverflowMenuControl.displayName = 'OverflowMenuControl';
//# sourceMappingURL=OverflowMenuControl.js.map