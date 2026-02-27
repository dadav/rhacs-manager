"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardWrapper = exports.DashboardBreadcrumb = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const components_1 = require("../components");
const DashboardHeader_1 = require("./DashboardHeader");
exports.DashboardBreadcrumb = ((0, jsx_runtime_1.jsxs)(components_1.Breadcrumb, { children: [(0, jsx_runtime_1.jsx)(components_1.BreadcrumbItem, { children: "Section home" }), (0, jsx_runtime_1.jsx)(components_1.BreadcrumbItem, { to: "#", children: "Section title" }), (0, jsx_runtime_1.jsx)(components_1.BreadcrumbItem, { to: "#", children: "Section title" }), (0, jsx_runtime_1.jsx)(components_1.BreadcrumbItem, { to: "#", isActive: true, children: "Section landing" })] }));
const PageTemplateTitle = ((0, jsx_runtime_1.jsx)(components_1.PageSection, { children: (0, jsx_runtime_1.jsxs)(components_1.Content, { children: [(0, jsx_runtime_1.jsx)("h1", { children: "Main title" }), (0, jsx_runtime_1.jsx)("p", { children: "This is a full page demo." })] }) }));
const DashboardWrapper = (_a) => {
    var { children, mainContainerId, banner, breadcrumb, masthead, sidebar, sidebarNavOpen, onPageResize, hasDefaultBreadcrumb, notificationDrawer, isNotificationDrawerExpanded, hasPageTemplateTitle } = _a, pageProps = tslib_1.__rest(_a, ["children", "mainContainerId", "banner", "breadcrumb", "masthead", "sidebar", "sidebarNavOpen", "onPageResize", "hasDefaultBreadcrumb", "notificationDrawer", "isNotificationDrawerExpanded", "hasPageTemplateTitle"]);
    const [activeItem, setActiveItem] = (0, react_1.useState)(1);
    const onNavSelect = (_event, result) => {
        setActiveItem(result.itemId);
    };
    let renderedBreadcrumb;
    if (!hasDefaultBreadcrumb) {
        renderedBreadcrumb = breadcrumb !== null && breadcrumb !== void 0 ? breadcrumb : exports.DashboardBreadcrumb;
    }
    const PageNav = ((0, jsx_runtime_1.jsx)(components_1.Nav, { onSelect: onNavSelect, "aria-label": "Nav", children: (0, jsx_runtime_1.jsxs)(components_1.NavList, { children: [(0, jsx_runtime_1.jsx)(components_1.NavItem, { itemId: 0, isActive: activeItem === 0, to: "#system-panel", children: "System panel" }), (0, jsx_runtime_1.jsx)(components_1.NavItem, { itemId: 1, isActive: activeItem === 1, to: "#policy", children: "Policy" }), (0, jsx_runtime_1.jsx)(components_1.NavItem, { itemId: 2, isActive: activeItem === 2, to: "#auth", children: "Authentication" }), (0, jsx_runtime_1.jsx)(components_1.NavItem, { itemId: 3, isActive: activeItem === 3, to: "#network", children: "Network services" }), (0, jsx_runtime_1.jsx)(components_1.NavItem, { itemId: 4, isActive: activeItem === 4, to: "#server", children: "Server" })] }) }));
    const _sidebar = ((0, jsx_runtime_1.jsx)(components_1.PageSidebar, { isSidebarOpen: sidebarNavOpen || false, children: (0, jsx_runtime_1.jsx)(components_1.PageSidebarBody, { children: PageNav }) }));
    const defaultContainerId = 'main-content-page-layout-default-nav';
    const handleClick = (event) => {
        event.preventDefault();
        const mainContentElement = document.getElementById(mainContainerId !== null && mainContainerId !== void 0 ? mainContainerId : defaultContainerId);
        if (mainContentElement) {
            mainContentElement.focus();
        }
    };
    const PageSkipToContent = ((0, jsx_runtime_1.jsx)(components_1.SkipToContent, { onClick: handleClick, href: `#${mainContainerId !== null && mainContainerId !== void 0 ? mainContainerId : defaultContainerId}`, children: "Skip to content" }));
    return ((0, jsx_runtime_1.jsxs)(components_1.Page, Object.assign({ masthead: masthead !== null && masthead !== void 0 ? masthead : (0, jsx_runtime_1.jsx)(DashboardHeader_1.DashboardHeader, {}), sidebar: sidebar !== null && sidebar !== void 0 ? sidebar : _sidebar, isManagedSidebar: true, skipToContent: PageSkipToContent, banner: banner, breadcrumb: renderedBreadcrumb, mainContainerId: mainContainerId !== null && mainContainerId !== void 0 ? mainContainerId : defaultContainerId, notificationDrawer: notificationDrawer, isNotificationDrawerExpanded: isNotificationDrawerExpanded }, (typeof onPageResize === 'function' && {
        onPageResize: (event, resizeObject) => onPageResize(event, resizeObject)
    }), pageProps, { children: [hasPageTemplateTitle && PageTemplateTitle, children] })));
};
exports.DashboardWrapper = DashboardWrapper;
exports.DashboardWrapper.displayName = 'DashboardWrapper';
//# sourceMappingURL=DashboardWrapper.js.map