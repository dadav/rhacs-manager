import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
export const PopoverHeaderText = (_a) => {
    var { children, className, headingLevel } = _a, props = __rest(_a, ["children", "className", "headingLevel"]);
    const HeadingLevel = headingLevel;
    return (_jsx(HeadingLevel, Object.assign({ className: css(styles.popoverTitleText, className) }, props, { children: children })));
};
PopoverHeaderText.displayName = 'PopoverHeaderText';
//# sourceMappingURL=PopoverHeaderText.js.map