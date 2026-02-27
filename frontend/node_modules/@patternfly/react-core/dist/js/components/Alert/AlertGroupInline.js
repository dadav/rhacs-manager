"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertGroupInline = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const alert_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Alert/alert-group"));
const AlertGroupContext_1 = require("./AlertGroupContext");
const helpers_1 = require("../../helpers");
const AlertGroupInline = (_a) => {
    var { className, children, hasAnimations: hasAnimationsProp, isToast, isLiveRegion, onOverflowClick, overflowMessage } = _a, props = tslib_1.__rest(_a, ["className", "children", "hasAnimations", "isToast", "isLiveRegion", "onOverflowClick", "overflowMessage"]);
    const hasAnimations = (0, helpers_1.useHasAnimations)(hasAnimationsProp);
    const [handleTransitionEnd, setHandleTransitionEnd] = (0, react_1.useState)(() => () => { });
    const updateTransitionEnd = (onTransitionEnd) => {
        setHandleTransitionEnd(() => onTransitionEnd);
    };
    // Clear transition callback on unmount to prevent memory leaks
    (0, react_1.useEffect)(() => () => {
        setHandleTransitionEnd(() => () => { });
    }, []);
    const onTransitionEnd = (event) => {
        var _a;
        if (!hasAnimations) {
            return;
        }
        const prefersReducedMotion = !((_a = window.matchMedia('(prefers-reduced-motion: no-preference)')) === null || _a === void 0 ? void 0 : _a.matches);
        if (
        // If a user has no motion preference, we want to target the grid template rows transition
        // so that the onClose is called after the "slide up" animation of other alerts finishes.
        // If they have motion preference, we don't need to check for a specific transition since only opacity should fire.
        (prefersReducedMotion || (!prefersReducedMotion && event.propertyName === 'grid-template-rows')) &&
            event.target.className.includes(alert_group_1.default.modifiers.offstageRight)) {
            handleTransitionEnd();
            // Clear the callback after execution to prevent memory retention
            setHandleTransitionEnd(() => () => { });
        }
    };
    return ((0, jsx_runtime_1.jsx)(AlertGroupContext_1.AlertGroupContext.Provider, { value: { hasAnimations, updateTransitionEnd }, children: (0, jsx_runtime_1.jsxs)("ul", Object.assign({ role: "list", "aria-live": isLiveRegion ? 'polite' : null, "aria-atomic": isLiveRegion ? false : null, className: (0, react_styles_1.css)(alert_group_1.default.alertGroup, className, isToast ? alert_group_1.default.modifiers.toast : '') }, props, { children: [react_1.Children.toArray(children).map((alert, index) => {
                    var _a;
                    return ((0, jsx_runtime_1.jsx)("li", { onTransitionEnd: onTransitionEnd, className: (0, react_styles_1.css)(alert_group_1.default.alertGroupItem, hasAnimations && alert_group_1.default.modifiers.offstageTop), children: alert }, ((_a = alert.props) === null || _a === void 0 ? void 0 : _a.id) ||
                        `alertGroupItem-${alert.key}` ||
                        index));
                }), overflowMessage && ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsx)("button", { onClick: onOverflowClick, className: (0, react_styles_1.css)(alert_group_1.default.alertGroupOverflowButton), children: overflowMessage }) }))] })) }));
};
exports.AlertGroupInline = AlertGroupInline;
exports.AlertGroupInline.displayName = 'AlertGroupInline';
//# sourceMappingURL=AlertGroupInline.js.map