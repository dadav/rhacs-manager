import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext } from 'react';
import styles from '@patternfly/react-styles/css/components/Page/page.mjs';
import { css } from '@patternfly/react-styles';
import { PageContextConsumer } from './PageContext';
export const pageSidebarContextDefaults = {
    isSidebarOpen: true
};
export const PageSidebarContext = createContext(pageSidebarContextDefaults);
export const PageSidebar = (_a) => {
    var { className = '', children, isSidebarOpen = true, id = 'page-sidebar' } = _a, props = __rest(_a, ["className", "children", "isSidebarOpen", "id"]);
    return (_jsx(PageContextConsumer, { children: ({ isManagedSidebar, isSidebarOpen: managedIsNavOpen }) => {
            const sidebarOpen = isManagedSidebar ? managedIsNavOpen : isSidebarOpen;
            return (_jsx("div", Object.assign({ id: id, className: css(styles.pageSidebar, sidebarOpen && styles.modifiers.expanded, !sidebarOpen && styles.modifiers.collapsed, className), "aria-hidden": !sidebarOpen }, props, { children: _jsx(PageSidebarContext.Provider, { value: { isSidebarOpen: sidebarOpen }, children: children }) })));
        } }));
};
PageSidebar.displayName = 'PageSidebar';
//# sourceMappingURL=PageSidebar.js.map