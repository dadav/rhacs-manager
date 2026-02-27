"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowMenuContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const overflow_menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/OverflowMenu/overflow-menu"));
const OverflowMenuContext_1 = require("./OverflowMenuContext");
const OverflowMenuContent = ({ className, children, isPersistent }) => ((0, jsx_runtime_1.jsx)(OverflowMenuContext_1.OverflowMenuContext.Consumer, { children: (value) => (!value.isBelowBreakpoint || isPersistent) && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(overflow_menu_1.default.overflowMenuContent, className), children: children })) }));
exports.OverflowMenuContent = OverflowMenuContent;
exports.OverflowMenuContent.displayName = 'OverflowMenuContent';
//# sourceMappingURL=OverflowMenuContent.js.map