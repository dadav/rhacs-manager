"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = exports.TabsComponent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tabs_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Tabs/tabs"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_left_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-left-icon'));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const plus_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/plus-icon'));
const util_1 = require("../../helpers/util");
const TabContent_1 = require("./TabContent");
const TabsContext_1 = require("./TabsContext");
const OverflowTab_1 = require("./OverflowTab");
const Button_1 = require("../Button");
const helpers_1 = require("../../helpers");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const c_tabs_link_accent_length_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_tabs_link_accent_length'));
const c_tabs_link_accent_start_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_tabs_link_accent_start'));
var TabsComponent;
(function (TabsComponent) {
    TabsComponent["div"] = "div";
    TabsComponent["nav"] = "nav";
})(TabsComponent || (exports.TabsComponent = TabsComponent = {}));
const variantStyle = {
    default: '',
    secondary: tabs_1.default.modifiers.secondary
};
class Tabs extends react_1.Component {
    constructor(props) {
        super(props);
        this.tabList = (0, react_1.createRef)();
        this.leftScrollButtonRef = (0, react_1.createRef)();
        this.direction = 'ltr';
        this.scrollTimeout = null;
        this.countOverflowingElements = (container) => {
            const elements = Array.from(container.children);
            return elements.filter((element) => !(0, util_1.isElementInView)(container, element, false)).length;
        };
        this.handleScrollButtons = () => {
            const { isOverflowHorizontal: isOverflowHorizontal } = this.props;
            // add debounce to the scroll event
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                const container = this.tabList.current;
                let disableBackScrollButton = true;
                let disableForwardScrollButton = true;
                let enableScrollButtons = false;
                let overflowingTabCount = 0;
                if (container && !this.props.isVertical && !isOverflowHorizontal) {
                    // get first element and check if it is in view
                    const overflowOnLeft = !(0, util_1.isElementInView)(container, container.firstChild, false);
                    // get last element and check if it is in view
                    const overflowOnRight = !(0, util_1.isElementInView)(container, container.lastChild, false);
                    enableScrollButtons = overflowOnLeft || overflowOnRight;
                    disableBackScrollButton = !overflowOnLeft;
                    disableForwardScrollButton = !overflowOnRight;
                }
                if (isOverflowHorizontal) {
                    overflowingTabCount = this.countOverflowingElements(container);
                }
                this.setState({
                    enableScrollButtons,
                    disableBackScrollButton,
                    disableForwardScrollButton,
                    overflowingTabCount
                });
            }, 100);
        };
        this.scrollBack = () => {
            // find first Element that is fully in view on the left, then scroll to the element before it
            if (this.tabList.current) {
                const container = this.tabList.current;
                const childrenArr = Array.from(container.children);
                let firstElementInView;
                let lastElementOutOfView;
                let i;
                for (i = 0; i < childrenArr.length && !firstElementInView; i++) {
                    if ((0, util_1.isElementInView)(container, childrenArr[i], false)) {
                        firstElementInView = childrenArr[i];
                        lastElementOutOfView = childrenArr[i - 1];
                    }
                }
                if (lastElementOutOfView) {
                    if (this.direction === 'ltr') {
                        // LTR scrolls left to go back
                        container.scrollLeft -= lastElementOutOfView.scrollWidth;
                    }
                    else {
                        // RTL scrolls right to go back
                        container.scrollLeft += lastElementOutOfView.scrollWidth;
                    }
                }
            }
        };
        this.scrollForward = () => {
            // find last Element that is fully in view on the right, then scroll to the element after it
            if (this.tabList.current) {
                const container = this.tabList.current;
                const childrenArr = Array.from(container.children);
                let lastElementInView;
                let firstElementOutOfView;
                for (let i = childrenArr.length - 1; i >= 0 && !lastElementInView; i--) {
                    if ((0, util_1.isElementInView)(container, childrenArr[i], false)) {
                        lastElementInView = childrenArr[i];
                        firstElementOutOfView = childrenArr[i + 1];
                    }
                }
                if (firstElementOutOfView) {
                    if (this.direction === 'ltr') {
                        // LTR scrolls right to go forward
                        container.scrollLeft += firstElementOutOfView.scrollWidth;
                    }
                    else {
                        // RTL scrolls left to go forward
                        container.scrollLeft -= firstElementOutOfView.scrollWidth;
                    }
                }
            }
        };
        this.hideScrollButtons = () => {
            const { enableScrollButtons, renderScrollButtons, showScrollButtons } = this.state;
            if (!enableScrollButtons && !showScrollButtons && renderScrollButtons) {
                this.setState({ renderScrollButtons: false });
            }
        };
        this.setAccentStyles = (shouldInitializeStyle) => {
            const currentItem = this.tabList.current.querySelector('li.pf-m-current');
            if (!currentItem) {
                return;
            }
            const { isVertical } = this.props;
            const { offsetWidth, offsetHeight, offsetTop } = currentItem;
            const lengthValue = isVertical ? offsetHeight : offsetWidth;
            const startValue = isVertical ? offsetTop : (0, util_1.getInlineStartProperty)(currentItem, this.tabList.current);
            this.setState(Object.assign({ currentLinkAccentLength: `${lengthValue}px`, currentLinkAccentStart: `${startValue}px` }, (shouldInitializeStyle && { isInitializingAccent: true })));
            setTimeout(() => {
                this.setState({ isInitializingAccent: false });
            }, 0);
        };
        this.handleResize = () => {
            this.handleScrollButtons();
            this.setAccentStyles();
        };
        this.state = {
            enableScrollButtons: false,
            showScrollButtons: false,
            renderScrollButtons: false,
            disableBackScrollButton: true,
            disableForwardScrollButton: true,
            shownKeys: this.props.defaultActiveKey !== undefined ? [this.props.defaultActiveKey] : [this.props.activeKey], // only for mountOnEnter case
            uncontrolledActiveKey: this.props.defaultActiveKey,
            uncontrolledIsExpandedLocal: this.props.defaultIsExpanded,
            ouiaStateId: (0, helpers_1.getDefaultOUIAId)(Tabs.displayName),
            overflowingTabCount: 0,
            isInitializingAccent: true,
            currentLinkAccentLength: c_tabs_link_accent_length_1.default.value,
            currentLinkAccentStart: c_tabs_link_accent_start_1.default.value
        };
        if (this.props.isVertical && this.props.expandable !== undefined) {
            if (!this.props.toggleAriaLabel && !this.props.toggleText) {
                // eslint-disable-next-line no-console
                console.error('Tabs:', 'toggleAriaLabel or the toggleText prop is required to make the toggle button accessible');
            }
        }
    }
    handleTabClick(event, eventKey, tabContentRef) {
        const { shownKeys } = this.state;
        const { onSelect, defaultActiveKey } = this.props;
        // if defaultActiveKey Tabs are uncontrolled, set new active key internally
        if (defaultActiveKey !== undefined) {
            this.setState({
                uncontrolledActiveKey: eventKey
            });
        }
        else {
            onSelect(event, eventKey);
        }
        // process any tab content sections outside of the component
        if (tabContentRef) {
            react_1.Children.toArray(this.props.children)
                .filter((child) => (0, react_1.isValidElement)(child))
                .filter(({ props }) => props.tabContentRef && props.tabContentRef.current)
                .forEach((child) => (child.props.tabContentRef.current.hidden = true));
            // most recently selected tabContent
            if (tabContentRef.current) {
                tabContentRef.current.hidden = false;
            }
        }
        if (this.props.mountOnEnter) {
            this.setState({
                shownKeys: shownKeys.concat(eventKey)
            });
        }
    }
    componentDidMount() {
        if (!this.props.isVertical) {
            if (helpers_1.canUseDOM) {
                window.addEventListener('resize', this.handleResize, false);
            }
            this.direction = (0, util_1.getLanguageDirection)(this.tabList.current);
            // call the handle resize function to check if scroll buttons should be shown
            this.handleScrollButtons();
        }
        this.setAccentStyles(true);
    }
    componentWillUnmount() {
        var _a;
        if (!this.props.isVertical) {
            if (helpers_1.canUseDOM) {
                window.removeEventListener('resize', this.handleResize, false);
            }
        }
        clearTimeout(this.scrollTimeout);
        (_a = this.leftScrollButtonRef.current) === null || _a === void 0 ? void 0 : _a.removeEventListener('transitionend', this.hideScrollButtons);
    }
    componentDidUpdate(prevProps, prevState) {
        this.direction = (0, util_1.getLanguageDirection)(this.tabList.current);
        const { activeKey, mountOnEnter, isOverflowHorizontal, children, defaultActiveKey } = this.props;
        const { shownKeys, overflowingTabCount, enableScrollButtons, uncontrolledActiveKey } = this.state;
        const isOnCloseUpdate = !!prevProps.onClose !== !!this.props.onClose;
        if ((defaultActiveKey !== undefined && prevState.uncontrolledActiveKey !== uncontrolledActiveKey) ||
            (defaultActiveKey === undefined && prevProps.activeKey !== activeKey) ||
            isOnCloseUpdate) {
            this.setAccentStyles(isOnCloseUpdate);
        }
        if (prevProps.activeKey !== activeKey && mountOnEnter && shownKeys.indexOf(activeKey) < 0) {
            this.setState({
                shownKeys: shownKeys.concat(activeKey)
            });
        }
        if (prevProps.children &&
            children &&
            react_1.Children.toArray(prevProps.children).length !== react_1.Children.toArray(children).length) {
            this.handleScrollButtons();
            this.setAccentStyles(true);
        }
        const currentOverflowingTabCount = this.countOverflowingElements(this.tabList.current);
        if (isOverflowHorizontal && currentOverflowingTabCount) {
            this.setState({ overflowingTabCount: currentOverflowingTabCount + overflowingTabCount });
        }
        if (!prevState.enableScrollButtons && enableScrollButtons) {
            this.setState({ renderScrollButtons: true });
            setTimeout(() => {
                var _a, _b;
                // Remove any existing listener before adding a new one to prevent accumulation
                (_a = this.leftScrollButtonRef.current) === null || _a === void 0 ? void 0 : _a.removeEventListener('transitionend', this.hideScrollButtons);
                (_b = this.leftScrollButtonRef.current) === null || _b === void 0 ? void 0 : _b.addEventListener('transitionend', this.hideScrollButtons);
                this.setState({ showScrollButtons: true });
            }, 100);
        }
        else if (prevState.enableScrollButtons && !enableScrollButtons) {
            this.setState({ showScrollButtons: false });
        }
        if (prevState.uncontrolledIsExpandedLocal !== this.state.uncontrolledIsExpandedLocal) {
            this.setAccentStyles(true);
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if (prevState.uncontrolledActiveKey === undefined) {
            return null;
        }
        const childrenHasTabWithActiveEventKey = react_1.Children.toArray(nextProps.children)
            .filter((child) => (0, react_1.isValidElement)(child))
            .some(({ props }) => props.eventKey === prevState.uncontrolledActiveKey);
        // if uncontrolledActiveKey is an existing eventKey of any Tab of nextProps.children --> don't update uncontrolledActiveKey
        if (childrenHasTabWithActiveEventKey) {
            return null;
        }
        // otherwise update state derived from nextProps.defaultActiveKey
        return {
            uncontrolledActiveKey: nextProps.defaultActiveKey,
            shownKeys: nextProps.defaultActiveKey !== undefined ? [nextProps.defaultActiveKey] : [nextProps.activeKey] // only for mountOnEnter case
        };
    }
    render() {
        const _a = this.props, { className, children, activeKey, defaultActiveKey, id, isAddButtonDisabled, isFilled, isSubtab, isVertical, isBox, hasNoBorderBottom, leftScrollAriaLabel, rightScrollAriaLabel, backScrollAriaLabel, forwardScrollAriaLabel, 'aria-label': ariaLabel, component, ouiaId, ouiaSafe, mountOnEnter, unmountOnExit, usePageInsets, inset, variant, expandable, isExpanded, defaultIsExpanded, toggleText, toggleAriaLabel, addButtonAriaLabel, onToggle, onClose, onAdd, isOverflowHorizontal: isOverflowHorizontal } = _a, props = tslib_1.__rest(_a, ["className", "children", "activeKey", "defaultActiveKey", "id", "isAddButtonDisabled", "isFilled", "isSubtab", "isVertical", "isBox", "hasNoBorderBottom", "leftScrollAriaLabel", "rightScrollAriaLabel", "backScrollAriaLabel", "forwardScrollAriaLabel", 'aria-label', "component", "ouiaId", "ouiaSafe", "mountOnEnter", "unmountOnExit", "usePageInsets", "inset", "variant", "expandable", "isExpanded", "defaultIsExpanded", "toggleText", "toggleAriaLabel", "addButtonAriaLabel", "onToggle", "onClose", "onAdd", "isOverflowHorizontal"]);
        const { showScrollButtons, renderScrollButtons, disableBackScrollButton, disableForwardScrollButton, shownKeys, uncontrolledActiveKey, uncontrolledIsExpandedLocal, overflowingTabCount, isInitializingAccent, currentLinkAccentLength, currentLinkAccentStart } = this.state;
        const filteredChildren = react_1.Children.toArray(children)
            .filter((child) => (0, react_1.isValidElement)(child))
            .filter(({ props }) => !props.isHidden);
        const filteredChildrenWithoutOverflow = filteredChildren.slice(0, filteredChildren.length - overflowingTabCount);
        const filteredChildrenOverflowing = filteredChildren.slice(filteredChildren.length - overflowingTabCount);
        const overflowingTabProps = filteredChildrenOverflowing.map((child) => child.props);
        const uniqueId = id || (0, util_1.getUniqueId)();
        const Component = component === TabsComponent.nav ? 'nav' : 'div';
        const localActiveKey = defaultActiveKey !== undefined ? uncontrolledActiveKey : activeKey;
        const isExpandedLocal = defaultIsExpanded !== undefined ? uncontrolledIsExpandedLocal : isExpanded;
        /*  Uncontrolled expandable tabs */
        const toggleTabs = (event, newValue) => {
            if (isExpanded === undefined) {
                this.setState({ uncontrolledIsExpandedLocal: newValue });
            }
            else {
                onToggle(event, newValue);
            }
        };
        const hasOverflowTab = isOverflowHorizontal && overflowingTabCount > 0;
        const overflowObjectProps = typeof isOverflowHorizontal === 'object' ? Object.assign({}, isOverflowHorizontal) : {};
        return ((0, jsx_runtime_1.jsxs)(TabsContext_1.TabsContextProvider, { value: {
                variant,
                mountOnEnter,
                unmountOnExit,
                localActiveKey,
                uniqueId,
                setAccentStyles: this.setAccentStyles,
                handleTabClick: (...args) => this.handleTabClick(...args),
                handleTabClose: onClose
            }, children: [(0, jsx_runtime_1.jsxs)(Component, Object.assign({ "aria-label": ariaLabel, className: (0, react_styles_1.css)(tabs_1.default.tabs, tabs_1.default.modifiers.animateCurrent, isFilled && tabs_1.default.modifiers.fill, isSubtab && tabs_1.default.modifiers.subtab, isVertical && tabs_1.default.modifiers.vertical, isVertical && expandable && (0, util_1.formatBreakpointMods)(expandable, tabs_1.default), isVertical && expandable && isExpandedLocal && tabs_1.default.modifiers.expanded, isBox && tabs_1.default.modifiers.box, showScrollButtons && tabs_1.default.modifiers.scrollable, usePageInsets && tabs_1.default.modifiers.pageInsets, hasNoBorderBottom && tabs_1.default.modifiers.noBorderBottom, (0, util_1.formatBreakpointMods)(inset, tabs_1.default), variantStyle[variant], hasOverflowTab && tabs_1.default.modifiers.overflow, isInitializingAccent && tabs_1.default.modifiers.initializingAccent, className) }, (0, helpers_1.getOUIAProps)(Tabs.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe), { id: id && id }, props, { style: Object.assign({ [c_tabs_link_accent_length_1.default.name]: currentLinkAccentLength, [c_tabs_link_accent_start_1.default.name]: currentLinkAccentStart }, props.style), children: [expandable && isVertical && ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tabs_1.default.tabsToggle), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tabs_1.default.tabsToggleButton), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { onClick: (event) => toggleTabs(event, !isExpandedLocal), variant: "plain", "aria-label": toggleAriaLabel, "aria-expanded": isExpandedLocal, id: `${randomId}-button`, "aria-labelledby": `${randomId}-text ${randomId}-button`, icon: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tabs_1.default.tabsToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }), children: toggleText && (0, jsx_runtime_1.jsx)("span", { id: `${randomId}-text`, children: toggleText }) }) }) })) })), renderScrollButtons && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tabs_1.default.tabsScrollButton), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { "aria-label": backScrollAriaLabel || leftScrollAriaLabel, onClick: this.scrollBack, isDisabled: disableBackScrollButton, "aria-hidden": disableBackScrollButton, ref: this.leftScrollButtonRef, variant: "plain", icon: (0, jsx_runtime_1.jsx)(angle_left_icon_1.default, {}) }) })), (0, jsx_runtime_1.jsxs)("ul", { className: (0, react_styles_1.css)(tabs_1.default.tabsList), ref: this.tabList, onScroll: this.handleScrollButtons, role: "tablist", children: [isOverflowHorizontal ? filteredChildrenWithoutOverflow : filteredChildren, hasOverflowTab && (0, jsx_runtime_1.jsx)(OverflowTab_1.OverflowTab, Object.assign({ overflowingTabs: overflowingTabProps }, overflowObjectProps))] }), renderScrollButtons && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tabs_1.default.tabsScrollButton), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { "aria-label": forwardScrollAriaLabel || rightScrollAriaLabel, onClick: this.scrollForward, isDisabled: disableForwardScrollButton, "aria-hidden": disableForwardScrollButton, variant: "plain", icon: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })), onAdd !== undefined && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tabs_1.default.tabsAdd), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", "aria-label": addButtonAriaLabel || 'Add tab', onClick: onAdd, icon: (0, jsx_runtime_1.jsx)(plus_icon_1.default, {}), isDisabled: isAddButtonDisabled }) }))] })), filteredChildren
                    .filter((child) => child.props.children &&
                    !(unmountOnExit && child.props.eventKey !== localActiveKey) &&
                    !(mountOnEnter && shownKeys.indexOf(child.props.eventKey) === -1))
                    .map((child) => ((0, jsx_runtime_1.jsx)(TabContent_1.TabContent, { activeKey: localActiveKey, child: child, id: child.props.id || uniqueId, ouiaId: child.props.ouiaId }, child.props.eventKey)))] }));
    }
}
exports.Tabs = Tabs;
Tabs.displayName = 'Tabs';
Tabs.defaultProps = {
    activeKey: 0,
    onSelect: () => undefined,
    isFilled: false,
    isSubtab: false,
    isVertical: false,
    isBox: false,
    hasNoBorderBottom: false,
    leftScrollAriaLabel: 'Scroll left',
    backScrollAriaLabel: 'Scroll back',
    rightScrollAriaLabel: 'Scroll right',
    forwardScrollAriaLabel: 'Scroll forward',
    component: TabsComponent.div,
    mountOnEnter: false,
    unmountOnExit: false,
    ouiaSafe: true,
    variant: 'default',
    onToggle: (_event, _isExpanded) => undefined
};
//# sourceMappingURL=Tabs.js.map