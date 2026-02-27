import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { DropdownItem } from '../Dropdown';
import { OverflowMenuContext } from './OverflowMenuContext';
export const OverflowMenuDropdownItem = (_a) => {
    var { children, isShared = false, itemId } = _a, additionalProps = __rest(_a, ["children", "isShared", "itemId"]);
    return (_jsx(OverflowMenuContext.Consumer, { children: (value) => (!isShared || value.isBelowBreakpoint) && (_jsx(DropdownItem, Object.assign({ component: "button", value: itemId }, additionalProps, { children: children }))) }));
};
OverflowMenuDropdownItem.displayName = 'OverflowMenuDropdownItem';
//# sourceMappingURL=OverflowMenuDropdownItem.js.map