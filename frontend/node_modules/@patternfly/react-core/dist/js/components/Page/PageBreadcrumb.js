"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageBreadcrumb = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const page_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Page/page"));
const util_1 = require("../../helpers/util");
const PageContext_1 = require("./PageContext");
const PageBody_1 = require("./PageBody");
const PageBreadcrumb = (_a) => {
    var { className = '', children, isWidthLimited, stickyOnBreakpoint, hasShadowTop = false, hasShadowBottom = false, hasOverflowScroll = false, 'aria-label': ariaLabel, hasBodyWrapper = true } = _a, props = tslib_1.__rest(_a, ["className", "children", "isWidthLimited", "stickyOnBreakpoint", "hasShadowTop", "hasShadowBottom", "hasOverflowScroll", 'aria-label', "hasBodyWrapper"]);
    const { height, getVerticalBreakpoint } = (0, react_1.useContext)(PageContext_1.PageContext);
    (0, react_1.useEffect)(() => {
        if (hasOverflowScroll && !ariaLabel) {
            /* eslint-disable no-console */
            console.warn('PageBreadcrumb: An accessible aria-label is required when hasOverflowScroll is set to true.');
        }
    }, [hasOverflowScroll, ariaLabel]);
    return ((0, jsx_runtime_1.jsx)("section", Object.assign({ className: (0, react_styles_1.css)(page_1.default.pageMainBreadcrumb, (0, util_1.formatBreakpointMods)(stickyOnBreakpoint, page_1.default, 'sticky-', getVerticalBreakpoint(height), true), isWidthLimited && page_1.default.modifiers.limitWidth, hasShadowTop && page_1.default.modifiers.shadowTop, hasShadowBottom && page_1.default.modifiers.shadowBottom, hasOverflowScroll && page_1.default.modifiers.overflowScroll, className) }, (hasOverflowScroll && { tabIndex: 0 }), { "aria-label": ariaLabel }, props, { children: hasBodyWrapper ? (0, jsx_runtime_1.jsx)(PageBody_1.PageBody, { children: children }) : children })));
};
exports.PageBreadcrumb = PageBreadcrumb;
exports.PageBreadcrumb.displayName = 'PageBreadcrumb';
//# sourceMappingURL=PageBreadcrumb.js.map