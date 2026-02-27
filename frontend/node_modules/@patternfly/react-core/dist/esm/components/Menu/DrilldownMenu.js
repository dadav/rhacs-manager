import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createRef } from 'react';
import { Menu } from './Menu';
import { MenuContent } from './MenuContent';
import { MenuList } from './MenuList';
import { MenuContext } from './MenuContext';
export const DrilldownMenu = (_a) => {
    var { children, id, isMenuDrilledIn = false, getHeight } = _a, props = __rest(_a, ["children", "id", "isMenuDrilledIn", "getHeight"]);
    return (
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _jsx(MenuContext.Consumer, { children: (_a) => {
            var { menuId, parentMenu, flyoutRef, setFlyoutRef, disableHover } = _a, context = __rest(_a, ["menuId", "parentMenu", "flyoutRef", "setFlyoutRef", "disableHover"]);
            return (_jsx(Menu, Object.assign({ id: id, parentMenu: menuId, isMenuDrilledIn: isMenuDrilledIn, isRootMenu: false, ref: createRef() }, context, props, { children: _jsx(MenuContent, { getHeight: getHeight, children: _jsx(MenuList, { children: children }) }) })));
        } })
    /* eslint-enable @typescript-eslint/no-unused-vars */
    );
};
DrilldownMenu.displayName = 'DrilldownMenu';
//# sourceMappingURL=DrilldownMenu.js.map