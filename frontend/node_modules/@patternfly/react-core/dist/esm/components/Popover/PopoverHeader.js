import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
import { PopoverHeaderIcon } from './PopoverHeaderIcon';
import { PopoverHeaderText } from './PopoverHeaderText';
export const PopoverHeader = (_a) => {
    var { children, icon, className, titleHeadingLevel = 'h6', alertSeverityVariant, id, alertSeverityScreenReaderText } = _a, props = __rest(_a, ["children", "icon", "className", "titleHeadingLevel", "alertSeverityVariant", "id", "alertSeverityScreenReaderText"]);
    return (_jsx("header", Object.assign({ className: css(styles.popoverHeader, className) }, props, { children: _jsxs("div", { className: css(styles.popoverTitle), id: id, children: [icon && _jsx(PopoverHeaderIcon, { children: icon }), _jsxs(PopoverHeaderText, { headingLevel: titleHeadingLevel, children: [alertSeverityVariant && alertSeverityScreenReaderText && (_jsx("span", { className: "pf-v6-screen-reader", children: alertSeverityScreenReaderText })), children] })] }) })));
};
PopoverHeader.displayName = 'PopoverHeader';
//# sourceMappingURL=PopoverHeader.js.map