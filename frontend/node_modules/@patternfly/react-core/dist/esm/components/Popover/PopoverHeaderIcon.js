import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
export const PopoverHeaderIcon = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("span", Object.assign({ className: css(styles.popoverTitleIcon, className) }, props, { children: children })));
};
PopoverHeaderIcon.displayName = 'PopoverHeaderIcon';
//# sourceMappingURL=PopoverHeaderIcon.js.map