import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useRef } from 'react';
import { css } from '@patternfly/react-styles';
import { Button, ButtonVariant } from '../../../components/Button';
import { Tooltip } from '../../../components/Tooltip';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
export const DualListSelectorControlBase = (_a) => {
    var { innerRef, children = null, className, 'aria-label': ariaLabel, isDisabled = true, onClick = () => { }, tooltipContent, tooltipProps = {} } = _a, props = __rest(_a, ["innerRef", "children", "className", 'aria-label', "isDisabled", "onClick", "tooltipContent", "tooltipProps"]);
    const privateRef = useRef(null);
    const ref = innerRef || privateRef;
    return (_jsxs("div", Object.assign({ className: css(styles.dualListSelectorControlsItem, className) }, props, { children: [_jsx(Button, { isDisabled: isDisabled, "aria-disabled": isDisabled, variant: ButtonVariant.plain, onClick: onClick, "aria-label": ariaLabel, tabIndex: -1, ref: ref, children: children }), tooltipContent && _jsx(Tooltip, Object.assign({ content: tooltipContent, position: "left", triggerRef: ref }, tooltipProps))] })));
};
DualListSelectorControlBase.displayName = 'DualListSelectorControlBase';
export const DualListSelectorControl = forwardRef((props, ref) => (_jsx(DualListSelectorControlBase, Object.assign({ innerRef: ref }, props))));
DualListSelectorControl.displayName = 'DualListSelectorControl';
//# sourceMappingURL=DualListSelectorControl.js.map