import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useContext } from 'react';
import styles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
import { css } from '@patternfly/react-styles';
import { MenuContext } from './MenuContext';
export const MenuList = (_a) => {
    var { children = null, className, isAriaMultiselectable = false, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["children", "className", "isAriaMultiselectable", 'aria-label']);
    const { role } = useContext(MenuContext);
    return (_jsx("ul", Object.assign({ role: role }, (role === 'listbox' && { 'aria-multiselectable': isAriaMultiselectable }), { className: css(styles.menuList, className), "aria-label": ariaLabel }, props, { children: children })));
};
MenuList.displayName = 'MenuList';
//# sourceMappingURL=MenuList.js.map