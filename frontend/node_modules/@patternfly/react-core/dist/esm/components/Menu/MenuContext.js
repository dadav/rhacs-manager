import { createContext } from 'react';
export const MenuContext = createContext({
    menuId: null,
    parentMenu: null,
    onActionClick: () => null,
    onSelect: () => null,
    activeItemId: null,
    selected: null,
    drilledInMenus: [],
    drilldownItemPath: [],
    onDrillIn: null,
    onDrillOut: null,
    onGetMenuHeight: () => null,
    flyoutRef: null,
    setFlyoutRef: () => null,
    disableHover: false,
    role: 'menu'
});
export const MenuItemContext = createContext({
    itemId: null,
    isDisabled: false
});
//# sourceMappingURL=MenuContext.js.map