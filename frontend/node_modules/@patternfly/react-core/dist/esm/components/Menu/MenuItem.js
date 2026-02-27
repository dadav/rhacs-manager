import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
import { css } from '@patternfly/react-styles';
import topOffset from '@patternfly/react-tokens/dist/esm/c_menu_m_flyout__menu_top_offset';
import rightOffset from '@patternfly/react-tokens/dist/esm/c_menu_m_flyout__menu_m_left_right_offset';
import leftOffset from '@patternfly/react-tokens/dist/esm/c_menu_m_flyout__menu_left_offset';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import CheckIcon from '@patternfly/react-icons/dist/esm/icons/check-icon';
import { Checkbox } from '../Checkbox';
import { MenuContext, MenuItemContext } from './MenuContext';
import { MenuItemAction } from './MenuItemAction';
import { Tooltip } from '../Tooltip';
import { canUseDOM } from '../../helpers/util';
import { useIsomorphicLayoutEffect } from '../../helpers/useIsomorphicLayout';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
const FlyoutContext = createContext({
    direction: 'right'
});
const MenuItemBase = (_a) => {
    var { children, className, itemId = null, to, hasCheckbox = false, isActive = null, isFavorited = null, isLoadButton = false, isLoading = false, flyoutMenu, direction, description = null, onClick = () => { }, component = 'button', isDisabled = false, isAriaDisabled = false, isExternalLink = false, isSelected = null, isFocused, isDanger = false, icon, actions, onShowFlyout, drilldownMenu, isOnPath, innerRef, id, 'aria-label': ariaLabel, tooltipProps, rel, target, download } = _a, props = __rest(_a, ["children", "className", "itemId", "to", "hasCheckbox", "isActive", "isFavorited", "isLoadButton", "isLoading", "flyoutMenu", "direction", "description", "onClick", "component", "isDisabled", "isAriaDisabled", "isExternalLink", "isSelected", "isFocused", "isDanger", "icon", "actions", "onShowFlyout", "drilldownMenu", "isOnPath", "innerRef", "id", 'aria-label', "tooltipProps", "rel", "target", "download"]);
    const { menuId, parentMenu, onSelect, onActionClick, activeItemId, selected, drilldownItemPath, onDrillIn, onDrillOut, flyoutRef, setFlyoutRef, disableHover, role: menuRole } = useContext(MenuContext);
    let Component = (to ? 'a' : component);
    if (hasCheckbox && !to) {
        Component = 'label';
    }
    const [flyoutTarget, setFlyoutTarget] = useState(null);
    const flyoutContext = useContext(FlyoutContext);
    const [flyoutXDirection, setFlyoutXDirection] = useState(flyoutContext.direction);
    const ref = useRef(undefined);
    const privateRef = useRef(undefined);
    const innerComponentRef = innerRef || privateRef;
    const flyoutVisible = ref === flyoutRef;
    const hasFlyout = flyoutMenu !== undefined;
    const showFlyout = (show) => {
        if (!flyoutVisible && show) {
            setFlyoutRef(ref);
        }
        else if (flyoutVisible && !show) {
            setFlyoutRef(null);
        }
        onShowFlyout && show && onShowFlyout();
    };
    useIsomorphicLayoutEffect(() => {
        if (hasFlyout && ref.current && canUseDOM) {
            const flyoutMenu = ref.current.lastElementChild;
            if (flyoutMenu && flyoutMenu.classList.contains(styles.menu)) {
                const origin = ref.current.getClientRects()[0];
                const rect = flyoutMenu.getClientRects()[0];
                if (origin && rect) {
                    const spaceLeftLeft = origin.x - rect.width;
                    const spaceLeftRight = window.innerWidth - origin.x - origin.width - rect.width;
                    let xDir = flyoutXDirection;
                    if (spaceLeftRight < 0 && xDir !== 'left') {
                        setFlyoutXDirection('left');
                        xDir = 'left';
                    }
                    else if (spaceLeftLeft < 0 && xDir !== 'right') {
                        setFlyoutXDirection('right');
                        xDir = 'right';
                    }
                    let xOffset = 0;
                    if (spaceLeftLeft < 0 && spaceLeftRight < 0) {
                        xOffset = xDir === 'right' ? -spaceLeftRight : -spaceLeftLeft;
                    }
                    if (xDir === 'left') {
                        flyoutMenu.classList.add(styles.modifiers.left);
                        flyoutMenu.style.setProperty(rightOffset.name, `-${xOffset}px`);
                    }
                    else {
                        flyoutMenu.style.setProperty(leftOffset.name, `-${xOffset}px`);
                    }
                    const spaceLeftBot = window.innerHeight - origin.y - rect.height;
                    const spaceLeftTop = window.innerHeight - rect.height;
                    if (spaceLeftTop < 0 && spaceLeftBot < 0) {
                        // working idea: page can usually scroll down, but not up
                        // TODO: proper scroll buttons
                    }
                    else if (spaceLeftBot < 0) {
                        flyoutMenu.style.setProperty(topOffset.name, `${spaceLeftBot}px`);
                    }
                }
            }
        }
    }, [flyoutVisible, flyoutMenu]);
    useEffect(() => {
        setFlyoutXDirection(flyoutContext.direction);
    }, [flyoutContext]);
    useEffect(() => {
        var _a, _b, _c;
        if (flyoutTarget) {
            if (flyoutVisible) {
                const flyoutMenu = flyoutTarget.nextElementSibling;
                const flyoutItems = Array.from(((_a = flyoutMenu === null || flyoutMenu === void 0 ? void 0 : flyoutMenu.getElementsByTagName('UL')[0]) === null || _a === void 0 ? void 0 : _a.children) || []).filter((el) => !(el.classList.contains('pf-m-disabled') || el.classList.contains(styles.divider)));
                (_c = (_b = flyoutItems[0]) === null || _b === void 0 ? void 0 : _b.firstChild) === null || _c === void 0 ? void 0 : _c.focus();
            }
            else {
                flyoutTarget.focus();
            }
        }
    }, [flyoutVisible, flyoutTarget]);
    const handleFlyout = (event) => {
        const key = event.key;
        const target = event.target;
        const type = event.type;
        if (key === ' ' || key === 'Enter' || key === 'ArrowRight' || type === 'click') {
            event.stopPropagation();
            event.preventDefault();
            if (!flyoutVisible) {
                showFlyout(true);
                setFlyoutTarget(target);
            }
        }
        if (key === 'Escape' || key === 'ArrowLeft') {
            if (flyoutVisible) {
                event.stopPropagation();
                showFlyout(false);
            }
        }
    };
    const onItemSelect = (event, onSelect) => {
        if (!isAriaDisabled) {
            // Trigger callback for Menu onSelect
            onSelect && onSelect(event, itemId);
            // Trigger callback for item onClick
            onClick && onClick(event);
        }
    };
    const _isOnPath = (isOnPath && isOnPath) || (drilldownItemPath && drilldownItemPath.includes(itemId)) || false;
    let drill;
    if (direction) {
        if (direction === 'down') {
            drill = (event) => onDrillIn &&
                onDrillIn(event, menuId, typeof drilldownMenu === 'function'
                    ? drilldownMenu().props.id
                    : drilldownMenu.props.id, itemId);
        }
        else {
            drill = (event) => onDrillOut && onDrillOut(event, parentMenu, itemId);
        }
    }
    let additionalProps = {};
    if (Component === 'a') {
        additionalProps = {
            href: to,
            'aria-disabled': isDisabled || isAriaDisabled ? true : null,
            // prevent invalid 'disabled' attribute on <a> tags
            disabled: null,
            target: isExternalLink ? '_blank' : target,
            rel,
            download
        };
    }
    else if (Component === 'button') {
        additionalProps = {
            type: 'button',
            'aria-disabled': isAriaDisabled ? true : null
        };
    }
    if (isOnPath) {
        additionalProps['aria-expanded'] = true;
    }
    else if (hasFlyout) {
        additionalProps['aria-haspopup'] = 'menu';
        additionalProps['aria-expanded'] = flyoutVisible;
    }
    const getAriaCurrent = () => {
        if (isActive !== null) {
            if (isActive) {
                return 'page';
            }
            else {
                return null;
            }
        }
        else if (itemId !== null && activeItemId !== null) {
            return itemId === activeItemId;
        }
        return null;
    };
    const getIsSelected = () => {
        if (isSelected !== null) {
            return isSelected;
        }
        else if (selected !== null && itemId !== null) {
            return (Array.isArray(selected) && selected.includes(itemId)) || itemId === selected;
        }
        return false;
    };
    const onMouseOver = () => {
        if (disableHover) {
            return;
        }
        if (hasFlyout) {
            showFlyout(true);
        }
        else {
            setFlyoutRef(null);
        }
    };
    useEffect(() => {
        if (isFocused && ref.current) {
            const itemEl = ref.current;
            const parentListEl = itemEl.parentElement;
            if (parentListEl) {
                const isAboveTop = itemEl.offsetTop - parentListEl.offsetTop < parentListEl.scrollTop;
                const isBelowBottom = itemEl.offsetTop - parentListEl.offsetTop + itemEl.clientHeight;
                if (isAboveTop || isBelowBottom) {
                    itemEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            }
        }
    }, [isFocused]);
    const isSelectMenu = menuRole === 'listbox';
    const renderItem = (_jsxs(_Fragment, { children: [_jsx(GenerateId, { children: (randomId) => (_jsxs(Component, Object.assign({ id: id, tabIndex: -1, className: css(styles.menuItem, getIsSelected() && !hasCheckbox && styles.modifiers.selected, className), "aria-current": getAriaCurrent() }, (!hasCheckbox && { disabled: isDisabled, 'aria-label': ariaLabel }), (!hasCheckbox && !flyoutMenu && { role: isSelectMenu ? 'option' : 'menuitem' }), (!hasCheckbox && !flyoutMenu && isSelectMenu && { 'aria-selected': getIsSelected() }), { ref: innerComponentRef }, (!hasCheckbox && {
                    onClick: (event) => {
                        if (!isAriaDisabled) {
                            onItemSelect(event, onSelect);
                            drill && drill(event);
                            flyoutMenu && handleFlyout(event);
                        }
                        else {
                            event.preventDefault();
                        }
                    }
                }), (hasCheckbox && { htmlFor: randomId }), additionalProps, { children: [_jsxs("span", { className: css(styles.menuItemMain), children: [direction === 'up' && (_jsx("span", { className: css(styles.menuItemToggleIcon), children: _jsx(AngleLeftIcon, {}) })), icon && _jsx("span", { className: css(styles.menuItemIcon), children: icon }), hasCheckbox && (_jsx("span", { className: css(styles.menuItemCheck), children: _jsx(Checkbox, { id: randomId, component: "span", isChecked: isSelected || false, onChange: (event) => onItemSelect(event, onSelect), isDisabled: isDisabled, "aria-disabled": isAriaDisabled }) })), _jsx("span", { className: css(styles.menuItemText), children: children }), isExternalLink && (_jsx("span", { className: css(styles.menuItemExternalIcon), children: _jsx(ExternalLinkAltIcon, {}) })), (flyoutMenu || direction === 'down') && (_jsx("span", { className: css(styles.menuItemToggleIcon), children: _jsx(AngleRightIcon, {}) })), getIsSelected() && (_jsx("span", { className: css(styles.menuItemSelectIcon), children: _jsx(CheckIcon, {}) }))] }), description && direction !== 'up' && (_jsx("span", { className: css(styles.menuItemDescription), children: _jsx("span", { children: description }) }))] }))) }), flyoutVisible && (_jsx(MenuContext.Provider, { value: { disableHover }, children: _jsx(FlyoutContext.Provider, { value: { direction: flyoutXDirection }, children: flyoutMenu }) })), typeof drilldownMenu === 'function' ? drilldownMenu() : drilldownMenu, _jsxs(MenuItemContext.Provider, { value: { itemId, isDisabled }, children: [actions, isFavorited !== null && (_jsx(MenuItemAction, { icon: "favorites", isFavorited: isFavorited, "aria-label": isFavorited ? 'starred' : 'not starred', onClick: (event) => onActionClick(event, itemId), tabIndex: -1, actionId: "fav" }))] })] }));
    return (_jsxs(_Fragment, { children: [_jsx("li", Object.assign({ className: css(styles.menuListItem, isDisabled && styles.modifiers.disabled, isAriaDisabled && styles.modifiers.ariaDisabled, _isOnPath && styles.modifiers.currentPath, isLoadButton && styles.modifiers.load, isLoading && styles.modifiers.loading, isFocused && 'pf-m-focus', isDanger && styles.modifiers.danger, className), onMouseOver: () => {
                    if (!isAriaDisabled) {
                        onMouseOver();
                    }
                } }, (flyoutMenu && !isAriaDisabled && { onKeyDown: handleFlyout }), { ref: ref, role: !hasCheckbox ? 'none' : 'menuitem' }, (hasCheckbox && { 'aria-label': ariaLabel }), props, { children: renderItem })), tooltipProps && _jsx(Tooltip, Object.assign({}, tooltipProps, { triggerRef: innerComponentRef }))] }));
};
export const MenuItem = forwardRef((props, ref) => (_jsx(MenuItemBase, Object.assign({}, props, { innerRef: ref }))));
MenuItem.displayName = 'MenuItem';
//# sourceMappingURL=MenuItem.js.map