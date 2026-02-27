"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemContext = exports.MenuContext = void 0;
const react_1 = require("react");
exports.MenuContext = (0, react_1.createContext)({
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
exports.MenuItemContext = (0, react_1.createContext)({
    itemId: null,
    isDisabled: false
});
//# sourceMappingURL=MenuContext.js.map