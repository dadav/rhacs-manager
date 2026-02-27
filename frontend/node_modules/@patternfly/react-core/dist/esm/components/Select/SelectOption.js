import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { css } from '@patternfly/react-styles';
import { MenuItem } from '../Menu';
const SelectOptionBase = (_a) => {
    var { children, className, innerRef, value } = _a, props = __rest(_a, ["children", "className", "innerRef", "value"]);
    return (_jsx(MenuItem, Object.assign({ itemId: value, ref: innerRef, className: css(className) }, props, { children: children })));
};
export const SelectOption = forwardRef((props, ref) => (_jsx(SelectOptionBase, Object.assign({}, props, { innerRef: ref }))));
SelectOption.displayName = 'SelectOption';
//# sourceMappingURL=SelectOption.js.map