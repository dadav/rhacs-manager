import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
import { css } from '@patternfly/react-styles';
export const PopoverFooter = (_a) => {
    var { children, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("footer", Object.assign({ className: css(styles.popoverFooter, className) }, props, { children: children })));
};
PopoverFooter.displayName = 'PopoverFooter';
//# sourceMappingURL=PopoverFooter.js.map