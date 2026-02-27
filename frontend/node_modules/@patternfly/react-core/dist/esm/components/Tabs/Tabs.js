import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, Component, createRef, isValidElement } from 'react';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
import { css } from '@patternfly/react-styles';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import PlusIcon from '@patternfly/react-icons/dist/esm/icons/plus-icon';
import { getUniqueId, isElementInView, formatBreakpointMods, getLanguageDirection, getInlineStartProperty } from '../../helpers/util';
import { TabContent } from './TabContent';
import { TabsContextProvider } from './TabsContext';
import { OverflowTab } from './OverflowTab';
import { Button } from '../Button';
import { getOUIAProps, getDefaultOUIAId, canUseDOM } from '../../helpers';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
import linkAccentLength from '@patternfly/react-tokens/dist/esm/c_tabs_link_accent_length';
import linkAccentStart from '@patternfly/react-tokens/dist/esm/c_tabs_link_accent_start';
export var TabsComponent;
(function (TabsComponent) {
    TabsComponent["div"] = "div";
    TabsComponent["nav"] = "nav";
})(TabsComponent || (TabsComponent = {}));
const variantStyle = {
    default: '',
    secondary: styles.modifiers.secondary
};
class Tabs extends Component {
    constructor(props) {
        super(props);
        this.tabList = createRef();
        this.leftScrollButtonRef = createRef();
        this.direction = 'ltr';
        this.scrollTimeout = null;
        this.countOverflowingElements = (container) => {
            const elements = Array.from(container.children);
            return elements.filter((element) => !isElementInView(container, element, false)).length;
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
                    const overflowOnLeft = !isElementInView(container, container.firstChild, false);
                    // get last element and check if it is in view
                    const overflowOnRight = !isElementInView(container, container.lastChild, false);
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
                    if (isElementInView(container, childrenArr[i], false)) {
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
                    if (isElementInView(container, childrenArr[i], false)) {
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
            const startValue = isVertical ? offsetTop : getInlineStartProperty(currentItem, this.tabList.current);
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
            ouiaStateId: getDefaultOUIAId(Tabs.displayName),
            overflowingTabCount: 0,
            isInitializingAccent: true,
            currentLinkAccentLength: linkAccentLength.value,
            currentLinkAccentStart: linkAccentStart.value
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
            Children.toArray(this.props.children)
                .filter((child) => isValidElement(child))
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
            if (canUseDOM) {
                window.addEventListener('resize', this.handleResize, false);
            }
            this.direction = getLanguageDirection(this.tabList.current);
            // call the handle resize function to check if scroll buttons should be shown
            this.handleScrollButtons();
        }
        this.setAccentStyles(true);
    }
    componentWillUnmount() {
        var _a;
        if (!this.props.isVertical) {
            if (canUseDOM) {
                window.removeEventListener('resize', this.handleResize, false);
            }
        }
        clearTimeout(this.scrollTimeout);
        (_a = this.leftScrollButtonRef.current) === null || _a === void 0 ? void 0 : _a.removeEventListener('transitionend', this.hideScrollButtons);
    }
    componentDidUpdate(prevProps, prevState) {
        this.direction = getLanguageDirection(this.tabList.current);
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
            Children.toArray(prevProps.children).length !== Children.toArray(children).length) {
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
        const childrenHasTabWithActiveEventKey = Children.toArray(nextProps.children)
            .filter((child) => isValidElement(child))
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
        const _a = this.props, { className, children, activeKey, defaultActiveKey, id, isAddButtonDisabled, isFilled, isSubtab, isVertical, isBox, hasNoBorderBottom, leftScrollAriaLabel, rightScrollAriaLabel, backScrollAriaLabel, forwardScrollAriaLabel, 'aria-label': ariaLabel, component, ouiaId, ouiaSafe, mountOnEnter, unmountOnExit, usePageInsets, inset, variant, expandable, isExpanded, defaultIsExpanded, toggleText, toggleAriaLabel, addButtonAriaLabel, onToggle, onClose, onAdd, isOverflowHorizontal: isOverflowHorizontal } = _a, props = __rest(_a, ["className", "children", "activeKey", "defaultActiveKey", "id", "isAddButtonDisabled", "isFilled", "isSubtab", "isVertical", "isBox", "hasNoBorderBottom", "leftScrollAriaLabel", "rightScrollAriaLabel", "backScrollAriaLabel", "forwardScrollAriaLabel", 'aria-label', "component", "ouiaId", "ouiaSafe", "mountOnEnter", "unmountOnExit", "usePageInsets", "inset", "variant", "expandable", "isExpanded", "defaultIsExpanded", "toggleText", "toggleAriaLabel", "addButtonAriaLabel", "onToggle", "onClose", "onAdd", "isOverflowHorizontal"]);
        const { showScrollButtons, renderScrollButtons, disableBackScrollButton, disableForwardScrollButton, shownKeys, uncontrolledActiveKey, uncontrolledIsExpandedLocal, overflowingTabCount, isInitializingAccent, currentLinkAccentLength, currentLinkAccentStart } = this.state;
        const filteredChildren = Children.toArray(children)
            .filter((child) => isValidElement(child))
            .filter(({ props }) => !props.isHidden);
        const filteredChildrenWithoutOverflow = filteredChildren.slice(0, filteredChildren.length - overflowingTabCount);
        const filteredChildrenOverflowing = filteredChildren.slice(filteredChildren.length - overflowingTabCount);
        const overflowingTabProps = filteredChildrenOverflowing.map((child) => child.props);
        const uniqueId = id || getUniqueId();
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
        return (_jsxs(TabsContextProvider, { value: {
                variant,
                mountOnEnter,
                unmountOnExit,
                localActiveKey,
                uniqueId,
                setAccentStyles: this.setAccentStyles,
                handleTabClick: (...args) => this.handleTabClick(...args),
                handleTabClose: onClose
            }, children: [_jsxs(Component, Object.assign({ "aria-label": ariaLabel, className: css(styles.tabs, styles.modifiers.animateCurrent, isFilled && styles.modifiers.fill, isSubtab && styles.modifiers.subtab, isVertical && styles.modifiers.vertical, isVertical && expandable && formatBreakpointMods(expandable, styles), isVertical && expandable && isExpandedLocal && styles.modifiers.expanded, isBox && styles.modifiers.box, showScrollButtons && styles.modifiers.scrollable, usePageInsets && styles.modifiers.pageInsets, hasNoBorderBottom && styles.modifiers.noBorderBottom, formatBreakpointMods(inset, styles), variantStyle[variant], hasOverflowTab && styles.modifiers.overflow, isInitializingAccent && styles.modifiers.initializingAccent, className) }, getOUIAProps(Tabs.displayName, ouiaId !== undefined ? ouiaId : this.state.ouiaStateId, ouiaSafe), { id: id && id }, props, { style: Object.assign({ [linkAccentLength.name]: currentLinkAccentLength, [linkAccentStart.name]: currentLinkAccentStart }, props.style), children: [expandable && isVertical && (_jsx(GenerateId, { children: (randomId) => (_jsx("div", { className: css(styles.tabsToggle), children: _jsx("div", { className: css(styles.tabsToggleButton), children: _jsx(Button, { onClick: (event) => toggleTabs(event, !isExpandedLocal), variant: "plain", "aria-label": toggleAriaLabel, "aria-expanded": isExpandedLocal, id: `${randomId}-button`, "aria-labelledby": `${randomId}-text ${randomId}-button`, icon: _jsx("span", { className: css(styles.tabsToggleIcon), children: _jsx(AngleRightIcon, {}) }), children: toggleText && _jsx("span", { id: `${randomId}-text`, children: toggleText }) }) }) })) })), renderScrollButtons && (_jsx("div", { className: css(styles.tabsScrollButton), children: _jsx(Button, { "aria-label": backScrollAriaLabel || leftScrollAriaLabel, onClick: this.scrollBack, isDisabled: disableBackScrollButton, "aria-hidden": disableBackScrollButton, ref: this.leftScrollButtonRef, variant: "plain", icon: _jsx(AngleLeftIcon, {}) }) })), _jsxs("ul", { className: css(styles.tabsList), ref: this.tabList, onScroll: this.handleScrollButtons, role: "tablist", children: [isOverflowHorizontal ? filteredChildrenWithoutOverflow : filteredChildren, hasOverflowTab && _jsx(OverflowTab, Object.assign({ overflowingTabs: overflowingTabProps }, overflowObjectProps))] }), renderScrollButtons && (_jsx("div", { className: css(styles.tabsScrollButton), children: _jsx(Button, { "aria-label": forwardScrollAriaLabel || rightScrollAriaLabel, onClick: this.scrollForward, isDisabled: disableForwardScrollButton, "aria-hidden": disableForwardScrollButton, variant: "plain", icon: _jsx(AngleRightIcon, {}) }) })), onAdd !== undefined && (_jsx("span", { className: css(styles.tabsAdd), children: _jsx(Button, { variant: "plain", "aria-label": addButtonAriaLabel || 'Add tab', onClick: onAdd, icon: _jsx(PlusIcon, {}), isDisabled: isAddButtonDisabled }) }))] })), filteredChildren
                    .filter((child) => child.props.children &&
                    !(unmountOnExit && child.props.eventKey !== localActiveKey) &&
                    !(mountOnEnter && shownKeys.indexOf(child.props.eventKey) === -1))
                    .map((child) => (_jsx(TabContent, { activeKey: localActiveKey, child: child, id: child.props.id || uniqueId, ouiaId: child.props.ouiaId }, child.props.eventKey)))] }));
    }
}
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
export { Tabs };
//# sourceMappingURL=Tabs.js.map