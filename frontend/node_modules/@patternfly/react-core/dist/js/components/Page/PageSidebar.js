"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageSidebar = exports.PageSidebarContext = exports.pageSidebarContextDefaults = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const page_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Page/page"));
const react_styles_1 = require("@patternfly/react-styles");
const PageContext_1 = require("./PageContext");
exports.pageSidebarContextDefaults = {
    isSidebarOpen: true
};
exports.PageSidebarContext = (0, react_1.createContext)(exports.pageSidebarContextDefaults);
const PageSidebar = (_a) => {
    var { className = '', children, isSidebarOpen = true, id = 'page-sidebar' } = _a, props = tslib_1.__rest(_a, ["className", "children", "isSidebarOpen", "id"]);
    return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContextConsumer, { children: ({ isManagedSidebar, isSidebarOpen: managedIsNavOpen }) => {
            const sidebarOpen = isManagedSidebar ? managedIsNavOpen : isSidebarOpen;
            return ((0, jsx_runtime_1.jsx)("div", Object.assign({ id: id, className: (0, react_styles_1.css)(page_1.default.pageSidebar, sidebarOpen && page_1.default.modifiers.expanded, !sidebarOpen && page_1.default.modifiers.collapsed, className), "aria-hidden": !sidebarOpen }, props, { children: (0, jsx_runtime_1.jsx)(exports.PageSidebarContext.Provider, { value: { isSidebarOpen: sidebarOpen }, children: children }) })));
        } }));
};
exports.PageSidebar = PageSidebar;
exports.PageSidebar.displayName = 'PageSidebar';
//# sourceMappingURL=PageSidebar.js.map