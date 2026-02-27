"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverflowTab = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tabs_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tabs/tabs"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const helpers_1 = require("../../helpers");
const Menu_1 = require("../Menu");
const TabsContext_1 = require("./TabsContext");
const TabTitleText_1 = require("./TabTitleText");
const OverflowTab = (_a) => {
    var { className, overflowingTabs = [], showTabCount, defaultTitleText = 'More', toggleAriaLabel, zIndex = 9999, shouldPreventScrollOnItemFocus = true, focusTimeoutDelay = 0, popperProps } = _a, props = tslib_1.__rest(_a, ["className", "overflowingTabs", "showTabCount", "defaultTitleText", "toggleAriaLabel", "zIndex", "shouldPreventScrollOnItemFocus", "focusTimeoutDelay", "popperProps"]);
    const menuRef = (0, react_1.useRef)(undefined);
    const overflowTabRef = (0, react_1.useRef)(undefined);
    const overflowLIRef = (0, react_1.useRef)(undefined);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const { localActiveKey, handleTabClick } = (0, react_1.useContext)(TabsContext_1.TabsContext);
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
    (0, react_1.useEffect)(() => {
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
    const overflowTab = ((0, jsx_runtime_1.jsx)("li", Object.assign({ className: (0, react_styles_1.css)(tabs_1.default.tabsItem, tabs_1.default.modifiers.overflow, selectedTab && tabs_1.default.modifiers.current, className), role: "presentation", ref: overflowLIRef }, props, { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, react_styles_1.css)(tabs_1.default.tabsLink, isExpanded && tabs_1.default.modifiers.expanded), onClick: () => toggleMenu(), "aria-label": toggleAriaLabel, "aria-haspopup": "menu", "aria-expanded": isExpanded, role: "tab", ref: overflowTabRef, children: [(0, jsx_runtime_1.jsxs)(TabTitleText_1.TabTitleText, { children: [tabTitle, showTabCount && tabTitle === defaultTitleText && ` (${overflowingTabs.length})`] }), (0, jsx_runtime_1.jsx)("span", { className: tabs_1.default.tabsLinkToggleIcon, children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) })] }) })));
    const tabs = overflowingTabs.map((tab) => ((0, jsx_runtime_1.jsx)(Menu_1.MenuItem, { itemId: tab.eventKey, isSelected: localActiveKey === tab.eventKey, children: tab.title }, tab.eventKey)));
    const onTabSelect = (event, key) => {
        closeMenu();
        const selectedTabRef = overflowingTabs.find((tab) => tab.eventKey === key).tabContentRef;
        handleTabClick(event, key, selectedTabRef);
    };
    const overflowMenu = ((0, jsx_runtime_1.jsx)(Menu_1.Menu, { ref: menuRef, onSelect: (ev, itemId) => onTabSelect(ev, itemId), children: (0, jsx_runtime_1.jsx)(Menu_1.MenuContent, { children: (0, jsx_runtime_1.jsx)(Menu_1.MenuList, { children: tabs }) }) }));
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [overflowTab, (0, jsx_runtime_1.jsx)(helpers_1.Popper, Object.assign({ triggerRef: overflowTabRef, popper: overflowMenu, popperRef: menuRef, isVisible: isExpanded, minWidth: "revert", appendTo: overflowLIRef.current, zIndex: zIndex }, popperProps))] }));
};
exports.OverflowTab = OverflowTab;
exports.OverflowTab.displayName = 'OverflowTab';
//# sourceMappingURL=OverflowTab.js.map