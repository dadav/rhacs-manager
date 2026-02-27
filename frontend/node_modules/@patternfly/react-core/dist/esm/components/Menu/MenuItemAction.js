import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
import { css } from '@patternfly/react-styles';
import { MenuContext, MenuItemContext } from './MenuContext';
import { Button } from '../Button';
const MenuItemActionBase = (_a) => {
    var { className, icon, onClick, 'aria-label': ariaLabel, isFavorited = null, isDisabled, actionId, innerRef } = _a, props = __rest(_a, ["className", "icon", "onClick", 'aria-label', "isFavorited", "isDisabled", "actionId", "innerRef"]);
    return (_jsx(MenuContext.Consumer, { children: ({ onActionClick }) => (_jsx(MenuItemContext.Consumer, { children: ({ itemId, isDisabled: isDisabledContext }) => {
                const onClickButton = (event) => {
                    // event specified on the MenuItemAction
                    onClick && onClick(event);
                    // event specified on the Menu
                    onActionClick && onActionClick(event, itemId, actionId);
                };
                return (_jsx("div", Object.assign({ className: css(styles.menuItemAction, isFavorited !== null && 'pf-m-favorite', isFavorited && styles.modifiers.favorited, className) }, props, { children: _jsx(Button, { "aria-label": ariaLabel, onClick: onClickButton, ref: innerRef, role: "menuitem", variant: "plain", isFavorite: isFavorited !== null, isFavorited: isFavorited !== null && isFavorited !== void 0 ? isFavorited : false, tabIndex: -1, isDisabled: isDisabled || isDisabledContext, icon: isFavorited === null ? icon : undefined }) })));
            } })) }));
};
export const MenuItemAction = forwardRef((props, ref) => (_jsx(MenuItemActionBase, Object.assign({}, props, { innerRef: ref }))));
MenuItemAction.displayName = 'MenuItemAction';
//# sourceMappingURL=MenuItemAction.js.map