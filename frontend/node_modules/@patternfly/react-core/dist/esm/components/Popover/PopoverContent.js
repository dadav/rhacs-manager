import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
import { css } from '@patternfly/react-styles';
export const PopoverContent = (_a) => {
    var { className = null, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ className: css(styles.popoverContent, className) }, props, { children: children })));
};
PopoverContent.displayName = 'PopoverContent';
//# sourceMappingURL=PopoverContent.js.map