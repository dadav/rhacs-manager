"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = exports.PageLayouts = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const page_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Page/page"));
const react_styles_1 = require("@patternfly/react-styles");
const t_global_breakpoint_xl_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/t_global_breakpoint_xl'));
const util_1 = require("../../helpers/util");
const Drawer_1 = require("../Drawer");
const PageBreadcrumb_1 = require("./PageBreadcrumb");
const PageGroup_1 = require("./PageGroup");
const resizeObserver_1 = require("../../helpers/resizeObserver");
const util_2 = require("../../helpers/util");
const PageContext_1 = require("./PageContext");
const PageBody_1 = require("./PageBody");
var PageLayouts;
(function (PageLayouts) {
    PageLayouts["vertical"] = "vertical";
    PageLayouts["horizontal"] = "horizontal";
})(PageLayouts || (exports.PageLayouts = PageLayouts = {}));
class Page extends react_1.Component {
    constructor(props) {
        super(props);
        this.mainRef = (0, react_1.createRef)();
        this.pageRef = (0, react_1.createRef)();
        this.observer = () => { };
        this.getWindowWidth = () => {
            if (util_1.canUseDOM) {
                return this.pageRef.current ? this.pageRef.current.clientWidth : window.innerWidth;
            }
            else {
                return 1200;
            }
        };
        this.isMobile = () => 
        // eslint-disable-next-line radix
        this.getWindowWidth() < Number.parseInt(t_global_breakpoint_xl_1.default.value, 10) * 16;
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
        this.handleResize = (0, util_1.debounce)(this.resize, 250);
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
            this.observer = (0, resizeObserver_1.getResizeObserver)(this.pageRef.current, this.handleResize);
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
        onPageResize, getBreakpoint, getVerticalBreakpoint, mainAriaLabel, mainTabIndex, mainComponent, horizontalSubnav, isHorizontalSubnavGrouped, isBreadcrumbGrouped, additionalGroupedContent, groupProps, breadcrumbProps, isContentFilled } = _a, rest = tslib_1.__rest(_a, ["banner", "breadcrumb", "isBreadcrumbWidthLimited", "className", "children", "masthead", "sidebar", "notificationDrawer", "isNotificationDrawerExpanded", "onNotificationDrawerExpand", "drawerDefaultSize", "drawerMinSize", "drawerMaxSize", "isHorizontalSubnavWidthLimited", "skipToContent", "role", "mainContainerId", "isManagedSidebar", "defaultManagedSidebarIsOpen", "onPageResize", "getBreakpoint", "getVerticalBreakpoint", "mainAriaLabel", "mainTabIndex", "mainComponent", "horizontalSubnav", "isHorizontalSubnavGrouped", "isBreadcrumbGrouped", "additionalGroupedContent", "groupProps", "breadcrumbProps", "isContentFilled"]);
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
            nav = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(page_1.default.pageMainSubnav, isHorizontalSubnavWidthLimited && page_1.default.modifiers.limitWidth), children: (0, jsx_runtime_1.jsx)(PageBody_1.PageBody, { children: horizontalSubnav }) }));
        }
        const crumb = breadcrumb ? ((0, jsx_runtime_1.jsx)(PageBreadcrumb_1.PageBreadcrumb, { stickyOnBreakpoint: breadcrumbProps === null || breadcrumbProps === void 0 ? void 0 : breadcrumbProps.stickyOnBreakpoint, isWidthLimited: isBreadcrumbWidthLimited, children: (0, jsx_runtime_1.jsx)(PageBody_1.PageBody, { children: breadcrumb }) })) : null;
        const isGrouped = isHorizontalSubnavGrouped || isBreadcrumbGrouped || additionalGroupedContent;
        const group = isGrouped ? ((0, jsx_runtime_1.jsxs)(PageGroup_1.PageGroup, Object.assign({}, groupProps, { children: [isHorizontalSubnavGrouped && nav, banner, isBreadcrumbGrouped && crumb, additionalGroupedContent] }))) : null;
        const Component = mainComponent;
        const main = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(page_1.default.pageMainContainer, isContentFilled && page_1.default.modifiers.fill), children: (0, jsx_runtime_1.jsxs)(Component, { ref: this.mainRef, role: role, id: mainContainerId, className: (0, react_styles_1.css)(page_1.default.pageMain), tabIndex: mainTabIndex, "aria-label": mainAriaLabel, children: [group, !isHorizontalSubnavGrouped && nav, banner, !isBreadcrumbGrouped && crumb, children] }) }));
        const panelContent = ((0, jsx_runtime_1.jsx)(Drawer_1.DrawerPanelContent, { defaultSize: drawerDefaultSize, minSize: drawerMinSize, maxSize: drawerMaxSize, children: notificationDrawer }));
        return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContextProvider, { value: context, children: (0, jsx_runtime_1.jsxs)("div", Object.assign({ ref: this.pageRef }, rest, { className: (0, react_styles_1.css)(page_1.default.page, width !== null && height !== null && 'pf-m-resize-observer', width !== null && `pf-m-breakpoint-${getBreakpoint(width)}`, height !== null && `pf-m-height-breakpoint-${getVerticalBreakpoint(height)}`, sidebar === null && page_1.default.modifiers.noSidebar, className), children: [skipToContent, masthead, sidebar, notificationDrawer && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(page_1.default.pageDrawer), children: (0, jsx_runtime_1.jsx)(Drawer_1.Drawer, { isExpanded: isNotificationDrawerExpanded, onExpand: (event) => onNotificationDrawerExpand(event), children: (0, jsx_runtime_1.jsx)(Drawer_1.DrawerContent, { panelContent: panelContent, children: main }) }) })), !notificationDrawer && main] })) }));
    }
}
exports.Page = Page;
Page.displayName = 'Page';
Page.defaultProps = {
    isManagedSidebar: false,
    isBreadcrumbWidthLimited: false,
    defaultManagedSidebarIsOpen: true,
    mainTabIndex: -1,
    isNotificationDrawerExpanded: false,
    onNotificationDrawerExpand: () => null,
    mainComponent: 'main',
    getBreakpoint: util_2.getBreakpoint,
    getVerticalBreakpoint: util_2.getVerticalBreakpoint
};
//# sourceMappingURL=Page.js.map