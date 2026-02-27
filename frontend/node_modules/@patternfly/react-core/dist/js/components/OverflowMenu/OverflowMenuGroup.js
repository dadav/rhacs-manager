"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowMenuGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const overflow_menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/OverflowMenu/overflow-menu"));
const OverflowMenuContext_1 = require("./OverflowMenuContext");
const OverflowMenuGroup = (_a) => {
    var { className, children, isPersistent = false, groupType } = _a, props = tslib_1.__rest(_a, ["className", "children", "isPersistent", "groupType"]);
    return ((0, jsx_runtime_1.jsx)(OverflowMenuContext_1.OverflowMenuContext.Consumer, { children: (value) => (isPersistent || !value.isBelowBreakpoint) && ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(overflow_menu_1.default.overflowMenuGroup, groupType === 'button' && overflow_menu_1.default.modifiers.buttonGroup, groupType === 'icon' && overflow_menu_1.default.modifiers.iconButtonGroup, className) }, props, { children: children }))) }));
};
exports.OverflowMenuGroup = OverflowMenuGroup;
exports.OverflowMenuGroup.displayName = 'OverflowMenuGroup';
//# sourceMappingURL=OverflowMenuGroup.js.map