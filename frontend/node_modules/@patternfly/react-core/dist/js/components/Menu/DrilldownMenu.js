"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrilldownMenu = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Menu_1 = require("./Menu");
const MenuContent_1 = require("./MenuContent");
const MenuList_1 = require("./MenuList");
const MenuContext_1 = require("./MenuContext");
const DrilldownMenu = (_a) => {
    var { children, id, isMenuDrilledIn = false, getHeight } = _a, props = tslib_1.__rest(_a, ["children", "id", "isMenuDrilledIn", "getHeight"]);
    return (
    /* eslint-disable @typescript-eslint/no-unused-vars */
    (0, jsx_runtime_1.jsx)(MenuContext_1.MenuContext.Consumer, { children: (_a) => {
            var { menuId, parentMenu, flyoutRef, setFlyoutRef, disableHover } = _a, context = tslib_1.__rest(_a, ["menuId", "parentMenu", "flyoutRef", "setFlyoutRef", "disableHover"]);
            return ((0, jsx_runtime_1.jsx)(Menu_1.Menu, Object.assign({ id: id, parentMenu: menuId, isMenuDrilledIn: isMenuDrilledIn, isRootMenu: false, ref: (0, react_1.createRef)() }, context, props, { children: (0, jsx_runtime_1.jsx)(MenuContent_1.MenuContent, { getHeight: getHeight, children: (0, jsx_runtime_1.jsx)(MenuList_1.MenuList, { children: children }) }) })));
        } })
    /* eslint-enable @typescript-eslint/no-unused-vars */
    );
};
exports.DrilldownMenu = DrilldownMenu;
exports.DrilldownMenu.displayName = 'DrilldownMenu';
//# sourceMappingURL=DrilldownMenu.js.map