"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const nav_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Nav/nav"));
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const divider_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Divider/divider"));
const react_styles_1 = require("@patternfly/react-styles");
const Nav_1 = require("./Nav");
const PageSidebar_1 = require("../Page/PageSidebar");
const helpers_1 = require("../../helpers");
const Popper_1 = require("../../helpers/Popper/Popper");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const NavItem = (_a) => {
    var { children, styleChildren = true, className, to, isActive = false, groupId = null, itemId = null, preventDefault = false, onClick, component = 'a', flyout, onShowFlyout, ouiaId, ouiaSafe, zIndex = 9999, icon } = _a, props = tslib_1.__rest(_a, ["children", "styleChildren", "className", "to", "isActive", "groupId", "itemId", "preventDefault", "onClick", "component", "flyout", "onShowFlyout", "ouiaId", "ouiaSafe", "zIndex", "icon"]);
    const { flyoutRef, setFlyoutRef, navRef } = (0, react_1.useContext)(Nav_1.NavContext);
    const { isSidebarOpen } = (0, react_1.useContext)(PageSidebar_1.PageSidebarContext);
    const [flyoutTarget, setFlyoutTarget] = (0, react_1.useState)(null);
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const ref = (0, react_1.useRef)(undefined);
    const flyoutVisible = ref === flyoutRef;
    const popperRef = (0, react_1.useRef)(undefined);
    const hasFlyout = flyout !== undefined;
    const Component = hasFlyout ? 'button' : component;
    // A NavItem should not be both a link and a flyout
    if (to && hasFlyout) {
        // eslint-disable-next-line no-console
        console.error('NavItem cannot have both "to" and "flyout" props.');
    }
    const showFlyout = (show, override) => {
        if ((!flyoutVisible || override) && show) {
            setFlyoutRef(ref);
        }
        else if ((flyoutVisible || override) && !show) {
            setFlyoutRef(null);
        }
        onShowFlyout && show && onShowFlyout();
    };
    const onMouseOver = (event) => {
        const evtContainedInFlyout = event.target.closest(`.${nav_1.default.navItem}.pf-m-flyout`);
        if (hasFlyout && !flyoutVisible) {
            showFlyout(true);
        }
        else if (flyoutRef !== null && !evtContainedInFlyout) {
            setFlyoutRef(null);
        }
    };
    const onFlyoutClick = (event) => {
        const target = event.target;
        const closestItem = target.closest('.pf-m-flyout');
        if (!closestItem) {
            if (hasFlyout) {
                showFlyout(false, true);
            }
            else if (flyoutRef !== null) {
                setFlyoutRef(null);
            }
        }
    };
    const handleFlyout = (event) => {
        var _a, _b;
        const key = event.key;
        const target = event.target;
        if ((key === ' ' || key === 'Enter' || key === 'ArrowRight') && hasFlyout && ((_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.contains(target))) {
            event.stopPropagation();
            event.preventDefault();
            if (!flyoutVisible) {
                showFlyout(true);
                setFlyoutTarget(target);
            }
        }
        // We only want the NavItem to handle closing a flyout menu if only the first level flyout is open.
        // Otherwise, MenuItem should handle closing its flyouts
        if ((key === 'Escape' || key === 'ArrowLeft') &&
            ((_b = popperRef === null || popperRef === void 0 ? void 0 : popperRef.current) === null || _b === void 0 ? void 0 : _b.querySelectorAll(`.${menu_1.default.menu}`).length) === 1) {
            if (flyoutVisible) {
                event.stopPropagation();
                event.preventDefault();
                showFlyout(false);
            }
        }
    };
    (0, react_1.useEffect)(() => {
        if (hasFlyout) {
            window.addEventListener('click', onFlyoutClick);
        }
        return () => {
            if (hasFlyout) {
                window.removeEventListener('click', onFlyoutClick);
            }
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (flyoutTarget) {
            if (flyoutVisible) {
                const flyoutItems = Array.from(popperRef.current.getElementsByTagName('UL')[0].children).filter((el) => !(el.classList.contains('pf-m-disabled') || el.classList.contains(divider_1.default.divider)));
                flyoutItems[0].firstChild.focus();
            }
            else {
                flyoutTarget.focus();
            }
        }
    }, [flyoutVisible, flyoutTarget]);
    const flyoutButton = ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(nav_1.default.navToggle), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(nav_1.default.navToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) }));
    const ariaFlyoutProps = {
        'aria-haspopup': 'menu',
        'aria-expanded': flyoutVisible
    };
    const tabIndex = isSidebarOpen ? null : -1;
    const renderDefaultLink = (context) => {
        const preventLinkDefault = preventDefault || !to;
        return ((0, jsx_runtime_1.jsxs)(Component, Object.assign({ href: to, onClick: (e) => context.onSelect(e, groupId, itemId, to, preventLinkDefault, onClick), className: (0, react_styles_1.css)(nav_1.default.navLink, isActive && nav_1.default.modifiers.current, isHovered && nav_1.default.modifiers.hover, className), "aria-current": isActive ? 'page' : null, tabIndex: tabIndex }, (hasFlyout && Object.assign({}, ariaFlyoutProps)), props, { children: [icon && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(nav_1.default.navLinkIcon), children: icon }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(`${nav_1.default.nav}__link-text`), children: children }), flyout && flyoutButton] })));
    };
    const renderClonedChild = (context, child) => (0, react_1.cloneElement)(child, Object.assign(Object.assign({ onClick: (e) => context.onSelect(e, groupId, itemId, to, preventDefault, onClick), 'aria-current': isActive ? 'page' : null }, (styleChildren && {
        className: (0, react_styles_1.css)(nav_1.default.navLink, isActive && nav_1.default.modifiers.current, child.props && child.props.className)
    })), { tabIndex: child.props.tabIndex || tabIndex, children: hasFlyout ? ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [child.props.children, flyoutButton] })) : (child.props.children) }));
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.NavItem.displayName, ouiaId, ouiaSafe);
    const handleMouseEnter = () => {
        setIsHovered(true);
    };
    const handleMouseLeave = () => {
        setIsHovered(false);
    };
    const flyoutPopper = ((0, jsx_runtime_1.jsx)(Popper_1.Popper, { triggerRef: ref, popper: (0, jsx_runtime_1.jsx)("div", { ref: popperRef, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: flyout }), popperRef: popperRef, placement: "right-start", isVisible: flyoutVisible, onDocumentKeyDown: handleFlyout, zIndex: zIndex, appendTo: navRef === null || navRef === void 0 ? void 0 : navRef.current }));
    const navItem = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("li", Object.assign({ onMouseOver: onMouseOver, className: (0, react_styles_1.css)(nav_1.default.navItem, hasFlyout && nav_1.default.modifiers.flyout, className), ref: ref }, ouiaProps, { children: (0, jsx_runtime_1.jsx)(Nav_1.NavContext.Consumer, { children: (context) => (0, react_1.isValidElement)(children)
                        ? renderClonedChild(context, children)
                        : renderDefaultLink(context) }) })), flyout && flyoutPopper] }));
    return navItem;
};
exports.NavItem = NavItem;
exports.NavItem.displayName = 'NavItem';
//# sourceMappingURL=NavItem.js.map