"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowMenuItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const overflow_menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/OverflowMenu/overflow-menu"));
const OverflowMenuContext_1 = require("./OverflowMenuContext");
const OverflowMenuItem = ({ className, children, isPersistent = false }) => ((0, jsx_runtime_1.jsx)(OverflowMenuContext_1.OverflowMenuContext.Consumer, { children: (value) => (isPersistent || !value.isBelowBreakpoint) && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(overflow_menu_1.default.overflowMenuItem, className), children: [" ", children, " "] })) }));
exports.OverflowMenuItem = OverflowMenuItem;
exports.OverflowMenuItem.displayName = 'OverflowMenuItem';
//# sourceMappingURL=OverflowMenuItem.js.map