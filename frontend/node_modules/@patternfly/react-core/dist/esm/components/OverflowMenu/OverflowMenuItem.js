import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/OverflowMenu/overflow-menu.mjs';
import { OverflowMenuContext } from './OverflowMenuContext';
export const OverflowMenuItem = ({ className, children, isPersistent = false }) => (_jsx(OverflowMenuContext.Consumer, { children: (value) => (isPersistent || !value.isBelowBreakpoint) && (_jsxs("div", { className: css(styles.overflowMenuItem, className), children: [" ", children, " "] })) }));
OverflowMenuItem.displayName = 'OverflowMenuItem';
//# sourceMappingURL=OverflowMenuItem.js.map