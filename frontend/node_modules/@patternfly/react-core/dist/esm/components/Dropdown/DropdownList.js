import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import { MenuList } from '../Menu';
export const DropdownList = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx(MenuList, Object.assign({ className: css(className) }, props, { children: children })));
};
DropdownList.displayName = 'DropdownList';
//# sourceMappingURL=DropdownList.js.map