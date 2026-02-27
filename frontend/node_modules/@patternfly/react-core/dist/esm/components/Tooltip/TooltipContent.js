import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Tooltip/tooltip.mjs';
import { css } from '@patternfly/react-styles';
export const TooltipContent = (_a) => {
    var { className, children, isLeftAligned } = _a, props = __rest(_a, ["className", "children", "isLeftAligned"]);
    return (_jsx("div", Object.assign({ className: css(styles.tooltipContent, isLeftAligned && styles.modifiers.textAlignLeft, className) }, props, { children: children })));
};
TooltipContent.displayName = 'TooltipContent';
//# sourceMappingURL=TooltipContent.js.map