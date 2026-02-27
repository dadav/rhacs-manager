"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const page_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Page/page"));
const util_1 = require("../../helpers/util");
const PageContext_1 = require("./PageContext");
const PageGroup = (_a) => {
    var { className = '', children, stickyOnBreakpoint, isFilled, hasShadowTop = false, hasShadowBottom = false, hasOverflowScroll = false, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["className", "children", "stickyOnBreakpoint", "isFilled", "hasShadowTop", "hasShadowBottom", "hasOverflowScroll", 'aria-label']);
    const { height, getVerticalBreakpoint } = (0, react_1.useContext)(PageContext_1.PageContext);
    (0, react_1.useEffect)(() => {
        if (hasOverflowScroll && !ariaLabel) {
            /* eslint-disable no-console */
            console.warn('PageGroup: An accessible aria-label is required when hasOverflowScroll is set to true.');
        }
    }, [hasOverflowScroll, ariaLabel]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(page_1.default.pageMainGroup, (0, util_1.formatBreakpointMods)(stickyOnBreakpoint, page_1.default, 'sticky-', getVerticalBreakpoint(height), true), isFilled === false && page_1.default.modifiers.noFill, isFilled === true && page_1.default.modifiers.fill, hasShadowTop && page_1.default.modifiers.shadowTop, hasShadowBottom && page_1.default.modifiers.shadowBottom, hasOverflowScroll && page_1.default.modifiers.overflowScroll, className) }, (hasOverflowScroll && { tabIndex: 0, role: 'region', 'aria-label': ariaLabel }), { children: children })));
};
exports.PageGroup = PageGroup;
exports.PageGroup.displayName = 'PageGroup';
//# sourceMappingURL=PageGroup.js.map