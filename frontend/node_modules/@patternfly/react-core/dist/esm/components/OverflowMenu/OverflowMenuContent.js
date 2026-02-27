import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/OverflowMenu/overflow-menu.mjs';
import { OverflowMenuContext } from './OverflowMenuContext';
export const OverflowMenuContent = ({ className, children, isPersistent }) => (_jsx(OverflowMenuContext.Consumer, { children: (value) => (!value.isBelowBreakpoint || isPersistent) && (_jsx("div", { className: css(styles.overflowMenuContent, className), children: children })) }));
OverflowMenuContent.displayName = 'OverflowMenuContent';
//# sourceMappingURL=OverflowMenuContent.js.map