"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemAction = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const react_styles_1 = require("@patternfly/react-styles");
const MenuContext_1 = require("./MenuContext");
const Button_1 = require("../Button");
const MenuItemActionBase = (_a) => {
    var { className, icon, onClick, 'aria-label': ariaLabel, isFavorited = null, isDisabled, actionId, innerRef } = _a, props = tslib_1.__rest(_a, ["className", "icon", "onClick", 'aria-label', "isFavorited", "isDisabled", "actionId", "innerRef"]);
    return ((0, jsx_runtime_1.jsx)(MenuContext_1.MenuContext.Consumer, { children: ({ onActionClick }) => ((0, jsx_runtime_1.jsx)(MenuContext_1.MenuItemContext.Consumer, { children: ({ itemId, isDisabled: isDisabledContext }) => {
                const onClickButton = (event) => {
                    // event specified on the MenuItemAction
                    onClick && onClick(event);
                    // event specified on the Menu
                    onActionClick && onActionClick(event, itemId, actionId);
                };
                return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(menu_1.default.menuItemAction, isFavorited !== null && 'pf-m-favorite', isFavorited && menu_1.default.modifiers.favorited, className) }, props, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { "aria-label": ariaLabel, onClick: onClickButton, ref: innerRef, role: "menuitem", variant: "plain", isFavorite: isFavorited !== null, isFavorited: isFavorited !== null && isFavorited !== void 0 ? isFavorited : false, tabIndex: -1, isDisabled: isDisabled || isDisabledContext, icon: isFavorited === null ? icon : undefined }) })));
            } })) }));
};
exports.MenuItemAction = (0, react_1.forwardRef)((props, ref) => ((0, jsx_runtime_1.jsx)(MenuItemActionBase, Object.assign({}, props, { innerRef: ref }))));
exports.MenuItemAction.displayName = 'MenuItemAction';
//# sourceMappingURL=MenuItemAction.js.map