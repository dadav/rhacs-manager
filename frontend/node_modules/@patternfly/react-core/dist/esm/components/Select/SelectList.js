import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import { MenuList } from '../Menu';
export const SelectList = (_a) => {
    var { children, className, isAriaMultiselectable = false } = _a, props = __rest(_a, ["children", "className", "isAriaMultiselectable"]);
    return (_jsx(MenuList, Object.assign({ isAriaMultiselectable: isAriaMultiselectable, className: css(className) }, props, { children: children })));
};
SelectList.displayName = 'SelectList';
//# sourceMappingURL=SelectList.js.map