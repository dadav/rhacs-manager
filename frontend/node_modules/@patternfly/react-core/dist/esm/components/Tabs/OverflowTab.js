import { __rest } from "tslib";
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
import { css } from '@patternfly/react-styles';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { Popper } from '../../helpers';
import { Menu, MenuContent, MenuList, MenuItem } from '../Menu';
import { TabsContext } from './TabsContext';
import { TabTitleText } from './TabTitleText';
export const OverflowTab = (_a) => {
    var { className, overflowingTabs = [], showTabCount, defaultTitleText = 'More', toggleAriaLabel, zIndex = 9999, shouldPreventScrollOnItemFocus = true, focusTimeoutDelay = 0, popperProps } = _a, props = __rest(_a, ["className", "overflowingTabs", "showTabCount", "defaultTitleText", "toggleAriaLabel", "zIndex", "shouldPreventScrollOnItemFocus", "focusTimeoutDelay", "popperProps"]);
    const menuRef = useRef(undefined);
    const overflowTabRef = useRef(undefined);
    const overflowLIRef = useRef(undefined);
    const [isExpanded, setIsExpanded] = useState(false);
    const { localActiveKey, handleTabClick } = useContext(TabsContext);
    const closeMenu = () => {
        setIsExpanded(false);
        overflowTabRef.current.focus();
    };
    const handleMenuKeys = (ev) => {
        var _a;
        const menuContainsEventTarget = (_a = menuRef === null || menuRef === void 0 ? void 0 : menuRef.current) === null || _a === void 0 ? void 0 : _a.contains(ev.target);
        if (isExpanded && menuContainsEventTarget && ev.key === 'Escape') {
            closeMenu();
        }
    };
    const handleClick = (ev) => {
        var _a, _b;
        const clickIsOutsideMenu = !((_a = menuRef === null || menuRef === void 0 ? void 0 : menuRef.current) === null || _a === void 0 ? void 0 : _a.contains(ev.target));
        const clickIsOutsideOverflowTab = !((_b = overflowTabRef === null || overflowTabRef === void 0 ? void 0 : overflowTabRef.current) === null || _b === void 0 ? void 0 : _b.contains(ev.target));
        if (isExpanded && clickIsOutsideMenu && clickIsOutsideOverflowTab) {
            closeMenu();
        }
    };
    useEffect(() => {
        window.addEventListener('click', handleClick);
        window.addEventListener('keydown', handleMenuKeys);
        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('keydown', handleMenuKeys);
        };
    }, [isExpanded, menuRef, overflowTabRef]);
    const selectedTab = overflowingTabs.find((tab) => tab.eventKey === localActiveKey);
    const tabTitle = (selectedTab === null || selectedTab === void 0 ? void 0 : selectedTab.title) ? selectedTab.title : defaultTitleText;
    const toggleMenu = () => {
        setIsExpanded((prevIsExpanded) => !prevIsExpanded);
        setTimeout(() => {
            if (menuRef === null || menuRef === void 0 ? void 0 : menuRef.current) {
                const firstElement = menuRef.current.querySelector('li > button,input:not(:disabled)');
                firstElement && firstElement.focus({ preventScroll: shouldPreventScrollOnItemFocus });
            }
        }, focusTimeoutDelay);
    };
    const overflowTab = (_jsx("li", Object.assign({ className: css(styles.tabsItem, styles.modifiers.overflow, selectedTab && styles.modifiers.current, className), role: "presentation", ref: overflowLIRef }, props, { children: _jsxs("button", { type: "button", className: css(styles.tabsLink, isExpanded && styles.modifiers.expanded), onClick: () => toggleMenu(), "aria-label": toggleAriaLabel, "aria-haspopup": "menu", "aria-expanded": isExpanded, role: "tab", ref: overflowTabRef, children: [_jsxs(TabTitleText, { children: [tabTitle, showTabCount && tabTitle === defaultTitleText && ` (${overflowingTabs.length})`] }), _jsx("span", { className: styles.tabsLinkToggleIcon, children: _jsx(AngleRightIcon, {}) })] }) })));
    const tabs = overflowingTabs.map((tab) => (_jsx(MenuItem, { itemId: tab.eventKey, isSelected: localActiveKey === tab.eventKey, children: tab.title }, tab.eventKey)));
    const onTabSelect = (event, key) => {
        closeMenu();
        const selectedTabRef = overflowingTabs.find((tab) => tab.eventKey === key).tabContentRef;
        handleTabClick(event, key, selectedTabRef);
    };
    const overflowMenu = (_jsx(Menu, { ref: menuRef, onSelect: (ev, itemId) => onTabSelect(ev, itemId), children: _jsx(MenuContent, { children: _jsx(MenuList, { children: tabs }) }) }));
    return (_jsxs(Fragment, { children: [overflowTab, _jsx(Popper, Object.assign({ triggerRef: overflowTabRef, popper: overflowMenu, popperRef: menuRef, isVisible: isExpanded, minWidth: "revert", appendTo: overflowLIRef.current, zIndex: zIndex }, popperProps))] }));
};
OverflowTab.displayName = 'OverflowTab';
//# sourceMappingURL=OverflowTab.js.map