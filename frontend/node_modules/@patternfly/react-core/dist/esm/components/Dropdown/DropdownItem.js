import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { css } from '@patternfly/react-styles';
import { MenuItem } from '../Menu';
import { useOUIAProps } from '../../helpers';
const DropdownItemBase = (_a) => {
    var { children, className, description, isDisabled, isAriaDisabled, value, onClick, ouiaId, ouiaSafe, innerRef, tooltipProps } = _a, props = __rest(_a, ["children", "className", "description", "isDisabled", "isAriaDisabled", "value", "onClick", "ouiaId", "ouiaSafe", "innerRef", "tooltipProps"]);
    const ouiaProps = useOUIAProps(DropdownItem.displayName, ouiaId, ouiaSafe);
    return (_jsx(MenuItem, Object.assign({ className: css(className), description: description, isDisabled: isDisabled, isAriaDisabled: isAriaDisabled, itemId: value, onClick: onClick, tooltipProps: tooltipProps, ref: innerRef }, ouiaProps, props, { children: children })));
};
export const DropdownItem = forwardRef((props, ref) => (_jsx(DropdownItemBase, Object.assign({}, props, { innerRef: ref }))));
DropdownItem.displayName = 'DropdownItem';
//# sourceMappingURL=DropdownItem.js.map