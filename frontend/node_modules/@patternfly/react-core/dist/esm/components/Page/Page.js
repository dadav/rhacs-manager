import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, createRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Page/page.mjs';
import { css } from '@patternfly/react-styles';
import globalBreakpointXl from '@patternfly/react-tokens/dist/esm/t_global_breakpoint_xl';
import { debounce, canUseDOM } from '../../helpers/util';
import { Drawer, DrawerContent, DrawerPanelContent } from '../Drawer';
import { PageBreadcrumb } from './PageBreadcrumb';
import { PageGroup } from './PageGroup';
import { getResizeObserver } from '../../helpers/resizeObserver';
import { getBreakpoint, getVerticalBreakpoint } from '../../helpers/util';
import { PageContextProvider } from './PageContext';
import { PageBody } from './PageBody';
export var PageLayouts;
(function (PageLayouts) {
    PageLayouts["vertical"] = "vertical";
    PageLayouts["horizontal"] = "horizontal";
})(PageLayouts || (PageLayouts = {}));
class Page extends Component {
    constructor(props) {
        super(props);
        this.mainRef = createRef();
        this.pageRef = createRef();
        this.observer = () => { };
        this.getWindowWidth = () => {
            if (canUseDOM) {
                return this.pageRef.current ? this.pageRef.current.clientWidth : window.innerWidth;
            }
            else {
                return 1200;
            }
        };
        this.isMobile = () => 
        // eslint-disable-next-line radix
        this.getWindowWidth() < Number.parseInt(globalBreakpointXl.value, 10) * 16;
        this.resize = (_event) => {
            var _a;
            const { onPageResize } = this.props;
            const mobileView = this.isMobile();
            if (onPageResize) {
                onPageResize(_event, { mobileView, windowSize: this.getWindowWidth() });
            }
            if (mobileView !== this.state.mobileView) {
                this.setState({ mobileView });
            }
            if ((_a = this.pageRef) === null || _a === void 0 ? void 0 : _a.current) {
                const currentWidth = this.pageRef.current.clientWidth;
                const currentHeight = this.pageRef.current.clientHeight;
                if (this.state.width !== currentWidth) {
                    this.setState({ width: currentWidth });
                }
                if (this.state.height !== currentHeight) {
                    this.setState({ height: currentHeight });
                }
            }
        };
        this.handleResize = debounce(this.resize, 250);
        this.handleMainClick = () => {
            if (this.isMobile() && this.state.mobileIsSidebarOpen && this.mainRef.current) {
                this.setState({ mobileIsSidebarOpen: false });
            }
        };
        this.onSidebarToggleMobile = () => {
            this.setState((prevState) => ({
                mobileIsSidebarOpen: !prevState.mobileIsSidebarOpen
            }));
        };
        this.onSidebarToggleDesktop = () => {
            this.setState((prevState) => ({
                desktopIsSidebarOpen: !prevState.desktopIsSidebarOpen
            }));
        };
        const { isManagedSidebar, defaultManagedSidebarIsOpen } = props;
        const managedSidebarOpen = !isManagedSidebar ? true : defaultManagedSidebarIsOpen;
        this.state = {
            desktopIsSidebarOpen: managedSidebarOpen,
            mobileIsSidebarOpen: false,
            mobileView: false,
            width: null,
            height: null
        };
    }
    componentDidMount() {
        const { isManagedSidebar, onPageResize } = this.props;
        if (isManagedSidebar || onPageResize) {
            this.observer = getResizeObserver(this.pageRef.current, this.handleResize);
            const currentRef = this.mainRef.current;
            if (currentRef) {
                currentRef.addEventListener('mousedown', this.handleMainClick);
                currentRef.addEventListener('touchstart', this.handleMainClick);
            }
            // Initial check if should be shown
            this.resize();
        }
    }
    componentWillUnmount() {
        const { isManagedSidebar, onPageResize } = this.props;
        if (isManagedSidebar || onPageResize) {
            this.observer();
            const currentRef = this.mainRef.current;
            if (currentRef) {
                currentRef.removeEventListener('mousedown', this.handleMainClick);
                currentRef.removeEventListener('touchstart', this.handleMainClick);
            }
        }
    }
    render() {
        const _a = this.props, { banner, breadcrumb, isBreadcrumbWidthLimited, className, children, masthead, sidebar, notificationDrawer, isNotificationDrawerExpanded, onNotificationDrawerExpand, drawerDefaultSize, drawerMinSize, drawerMaxSize, isHorizontalSubnavWidthLimited, skipToContent, role, mainContainerId, isManagedSidebar, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        defaultManagedSidebarIsOpen, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onPageResize, getBreakpoint, getVerticalBreakpoint, mainAriaLabel, mainTabIndex, mainComponent, horizontalSubnav, isHorizontalSubnavGrouped, isBreadcrumbGrouped, additionalGroupedContent, groupProps, breadcrumbProps, isContentFilled } = _a, rest = __rest(_a, ["banner", "breadcrumb", "isBreadcrumbWidthLimited", "className", "children", "masthead", "sidebar", "notificationDrawer", "isNotificationDrawerExpanded", "onNotificationDrawerExpand", "drawerDefaultSize", "drawerMinSize", "drawerMaxSize", "isHorizontalSubnavWidthLimited", "skipToContent", "role", "mainContainerId", "isManagedSidebar", "defaultManagedSidebarIsOpen", "onPageResize", "getBreakpoint", "getVerticalBreakpoint", "mainAriaLabel", "mainTabIndex", "mainComponent", "horizontalSubnav", "isHorizontalSubnavGrouped", "isBreadcrumbGrouped", "additionalGroupedContent", "groupProps", "breadcrumbProps", "isContentFilled"]);
        const { mobileView, mobileIsSidebarOpen, desktopIsSidebarOpen, width, height } = this.state;
        const context = {
            isManagedSidebar,
            onSidebarToggle: mobileView ? this.onSidebarToggleMobile : this.onSidebarToggleDesktop,
            isSidebarOpen: mobileView ? mobileIsSidebarOpen : desktopIsSidebarOpen,
            width,
            height,
            getBreakpoint,
            getVerticalBreakpoint
        };
        let nav = null;
        if (horizontalSubnav) {
            nav = (_jsx("div", { className: css(styles.pageMainSubnav, isHorizontalSubnavWidthLimited && styles.modifiers.limitWidth), children: _jsx(PageBody, { children: horizontalSubnav }) }));
        }
        const crumb = breadcrumb ? (_jsx(PageBreadcrumb, { stickyOnBreakpoint: breadcrumbProps === null || breadcrumbProps === void 0 ? void 0 : breadcrumbProps.stickyOnBreakpoint, isWidthLimited: isBreadcrumbWidthLimited, children: _jsx(PageBody, { children: breadcrumb }) })) : null;
        const isGrouped = isHorizontalSubnavGrouped || isBreadcrumbGrouped || additionalGroupedContent;
        const group = isGrouped ? (_jsxs(PageGroup, Object.assign({}, groupProps, { children: [isHorizontalSubnavGrouped && nav, banner, isBreadcrumbGrouped && crumb, additionalGroupedContent] }))) : null;
        const Component = mainComponent;
        const main = (_jsx("div", { className: css(styles.pageMainContainer, isContentFilled && styles.modifiers.fill), children: _jsxs(Component, { ref: this.mainRef, role: role, id: mainContainerId, className: css(styles.pageMain), tabIndex: mainTabIndex, "aria-label": mainAriaLabel, children: [group, !isHorizontalSubnavGrouped && nav, banner, !isBreadcrumbGrouped && crumb, children] }) }));
        const panelContent = (_jsx(DrawerPanelContent, { defaultSize: drawerDefaultSize, minSize: drawerMinSize, maxSize: drawerMaxSize, children: notificationDrawer }));
        return (_jsx(PageContextProvider, { value: context, children: _jsxs("div", Object.assign({ ref: this.pageRef }, rest, { className: css(styles.page, width !== null && height !== null && 'pf-m-resize-observer', width !== null && `pf-m-breakpoint-${getBreakpoint(width)}`, height !== null && `pf-m-height-breakpoint-${getVerticalBreakpoint(height)}`, sidebar === null && styles.modifiers.noSidebar, className), children: [skipToContent, masthead, sidebar, notificationDrawer && (_jsx("div", { className: css(styles.pageDrawer), children: _jsx(Drawer, { isExpanded: isNotificationDrawerExpanded, onExpand: (event) => onNotificationDrawerExpand(event), children: _jsx(DrawerContent, { panelContent: panelContent, children: main }) }) })), !notificationDrawer && main] })) }));
    }
}
Page.displayName = 'Page';
Page.defaultProps = {
    isManagedSidebar: false,
    isBreadcrumbWidthLimited: false,
    defaultManagedSidebarIsOpen: true,
    mainTabIndex: -1,
    isNotificationDrawerExpanded: false,
    onNotificationDrawerExpand: () => null,
    mainComponent: 'main',
    getBreakpoint,
    getVerticalBreakpoint
};
export { Page };
//# sourceMappingURL=Page.js.map