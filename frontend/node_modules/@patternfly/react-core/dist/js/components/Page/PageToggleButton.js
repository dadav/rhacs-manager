"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageToggleButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const Button_1 = require("../../components/Button");
const PageContext_1 = require("./PageContext");
const PageToggleButton = (_a) => {
    var { children, isSidebarOpen = true, onSidebarToggle = () => undefined, id = 'nav-toggle', 'aria-label': ariaLabel = 'Side navigation toggle', isHamburgerButton, hamburgerVariant } = _a, props = tslib_1.__rest(_a, ["children", "isSidebarOpen", "onSidebarToggle", "id", 'aria-label', "isHamburgerButton", "hamburgerVariant"]);
    return ((0, jsx_runtime_1.jsx)(PageContext_1.PageContextConsumer, { children: ({ isManagedSidebar, onSidebarToggle: managedOnSidebarToggle, isSidebarOpen: managedIsSidebarOpen }) => {
            const sidebarToggle = isManagedSidebar ? managedOnSidebarToggle : onSidebarToggle;
            const sidebarOpen = isManagedSidebar ? managedIsSidebarOpen : isSidebarOpen;
            return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ id: id, onClick: sidebarToggle, "aria-label": ariaLabel, "aria-expanded": sidebarOpen ? 'true' : 'false', variant: Button_1.ButtonVariant.plain, isHamburger: isHamburgerButton, hamburgerVariant: hamburgerVariant }, (isHamburgerButton && {
                isExpanded: sidebarOpen
            }), props, { children: !isHamburgerButton && children })));
        } }));
};
exports.PageToggleButton = PageToggleButton;
exports.PageToggleButton.displayName = 'PageToggleButton';
//# sourceMappingURL=PageToggleButton.js.map