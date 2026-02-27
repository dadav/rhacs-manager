import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Page/page.mjs';
import { css } from '@patternfly/react-styles';
export const PageSidebarBody = (_a) => {
    var { children, className, usePageInsets, isFilled, isContextSelector } = _a, props = __rest(_a, ["children", "className", "usePageInsets", "isFilled", "isContextSelector"]);
    return (_jsx("div", Object.assign({ className: css(styles.pageSidebarBody, usePageInsets && styles.modifiers.pageInsets, isFilled === false && styles.modifiers.noFill, isFilled === true && styles.modifiers.fill, isContextSelector === true && styles.modifiers.contextSelector, className) }, props, { children: children })));
};
PageSidebarBody.displayName = 'PageSidebarBody';
//# sourceMappingURL=PageSidebarBody.js.map