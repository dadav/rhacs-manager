import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, useState, useEffect } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Alert/alert-group.mjs';
import { AlertGroupContext } from './AlertGroupContext';
import { useHasAnimations } from '../../helpers';
export const AlertGroupInline = (_a) => {
    var { className, children, hasAnimations: hasAnimationsProp, isToast, isLiveRegion, onOverflowClick, overflowMessage } = _a, props = __rest(_a, ["className", "children", "hasAnimations", "isToast", "isLiveRegion", "onOverflowClick", "overflowMessage"]);
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    const [handleTransitionEnd, setHandleTransitionEnd] = useState(() => () => { });
    const updateTransitionEnd = (onTransitionEnd) => {
        setHandleTransitionEnd(() => onTransitionEnd);
    };
    // Clear transition callback on unmount to prevent memory leaks
    useEffect(() => () => {
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
            event.target.className.includes(styles.modifiers.offstageRight)) {
            handleTransitionEnd();
            // Clear the callback after execution to prevent memory retention
            setHandleTransitionEnd(() => () => { });
        }
    };
    return (_jsx(AlertGroupContext.Provider, { value: { hasAnimations, updateTransitionEnd }, children: _jsxs("ul", Object.assign({ role: "list", "aria-live": isLiveRegion ? 'polite' : null, "aria-atomic": isLiveRegion ? false : null, className: css(styles.alertGroup, className, isToast ? styles.modifiers.toast : '') }, props, { children: [Children.toArray(children).map((alert, index) => {
                    var _a;
                    return (_jsx("li", { onTransitionEnd: onTransitionEnd, className: css(styles.alertGroupItem, hasAnimations && styles.modifiers.offstageTop), children: alert }, ((_a = alert.props) === null || _a === void 0 ? void 0 : _a.id) ||
                        `alertGroupItem-${alert.key}` ||
                        index));
                }), overflowMessage && (_jsx("li", { children: _jsx("button", { onClick: onOverflowClick, className: css(styles.alertGroupOverflowButton), children: overflowMessage }) }))] })) }));
};
AlertGroupInline.displayName = 'AlertGroupInline';
//# sourceMappingURL=AlertGroupInline.js.map