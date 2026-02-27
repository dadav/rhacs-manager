import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useContext, useEffect } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Page/page.mjs';
import { formatBreakpointMods } from '../../helpers/util';
import { PageContext } from './PageContext';
import { PageBody } from './PageBody';
export const PageBreadcrumb = (_a) => {
    var { className = '', children, isWidthLimited, stickyOnBreakpoint, hasShadowTop = false, hasShadowBottom = false, hasOverflowScroll = false, 'aria-label': ariaLabel, hasBodyWrapper = true } = _a, props = __rest(_a, ["className", "children", "isWidthLimited", "stickyOnBreakpoint", "hasShadowTop", "hasShadowBottom", "hasOverflowScroll", 'aria-label', "hasBodyWrapper"]);
    const { height, getVerticalBreakpoint } = useContext(PageContext);
    useEffect(() => {
        if (hasOverflowScroll && !ariaLabel) {
            /* eslint-disable no-console */
            console.warn('PageBreadcrumb: An accessible aria-label is required when hasOverflowScroll is set to true.');
        }
    }, [hasOverflowScroll, ariaLabel]);
    return (_jsx("section", Object.assign({ className: css(styles.pageMainBreadcrumb, formatBreakpointMods(stickyOnBreakpoint, styles, 'sticky-', getVerticalBreakpoint(height), true), isWidthLimited && styles.modifiers.limitWidth, hasShadowTop && styles.modifiers.shadowTop, hasShadowBottom && styles.modifiers.shadowBottom, hasOverflowScroll && styles.modifiers.overflowScroll, className) }, (hasOverflowScroll && { tabIndex: 0 }), { "aria-label": ariaLabel }, props, { children: hasBodyWrapper ? _jsx(PageBody, { children: children }) : children })));
};
PageBreadcrumb.displayName = 'PageBreadcrumb';
//# sourceMappingURL=PageBreadcrumb.js.map