"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const react_styles_1 = require("@patternfly/react-styles");
const MenuContext_1 = require("./MenuContext");
const MenuList = (_a) => {
    var { children = null, className, isAriaMultiselectable = false, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "isAriaMultiselectable", 'aria-label']);
    const { role } = (0, react_1.useContext)(MenuContext_1.MenuContext);
    return ((0, jsx_runtime_1.jsx)("ul", Object.assign({ role: role }, (role === 'listbox' && { 'aria-multiselectable': isAriaMultiselectable }), { className: (0, react_styles_1.css)(menu_1.default.menuList, className), "aria-label": ariaLabel }, props, { children: children })));
};
exports.MenuList = MenuList;
exports.MenuList.displayName = 'MenuList';
//# sourceMappingURL=MenuList.js.map